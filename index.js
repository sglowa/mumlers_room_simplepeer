/*jshint esversion:6*/

// navigator.getUserMedia = ( navigator.getUserMedia ||
//                        navigator.webkitGetUserMedia ||
//                        navigator.mozGetUserMedia ||
//                        navigator.msGetUserMedia);

const constraints = {
	audio : false,
	video : {
		width:{
			exact:480,
			ideal:480
		},
		height:{
			exact:320,
			ideal:320
		},
		resizeMode:"crop-and-scale"
	}};

const Peer = require('simple-peer');
// let config  = {'iceServers': [
// 				   { urls: ['stun:stun.l.google.com:19302']},
// 				   { urls: ['turn:numb.viagenie.ca:3478'], //?transport=tcp
// 				   	username: 's9lowacki@gmail.com',
// 				    credential: 'testingtestint'}
// 				    ]
// 				};

let config = {"iceServers" : [
		{urls: [ "stun:eu-turn2.xirsys.com" ]},
		{username: "DhZKBos2ZBjkR6rB4RzhDu6rSVpWIWDLUZJWQhBYDDVGBtb5qcdVUtGYow26onscAAAAAF-DEjZjemFqbmljemVr",
	   	credential: "71ed90ba-0bcb-11eb-b26b-0242ac140004",
	   	urls: [
	       "turn:eu-turn2.xirsys.com:80?transport=udp",
	       "turn:eu-turn2.xirsys.com:3478?transport=udp",
	       "turn:eu-turn2.xirsys.com:80?transport=tcp",
	       "turn:eu-turn2.xirsys.com:3478?transport=tcp",
	       "turns:eu-turn2.xirsys.com:443?transport=tcp",
	       "turns:eu-turn2.xirsys.com:5349?transport=tcp"
	   	]}
	]};

let socket;
const peersRef = []; // locally stored array of peers in the room 
let partnerPrev;
let partnerNext;
window.getMembers = ()=>{
	console.log(peersRef);
};

navigator.mediaDevices.getUserMedia(constraints).then(myStream =>{

	socket = io();

	socket.on('connect',()=>{
		console.log('socket connected');
	});

	// TRYING TO GET CONFIG VIA API, DOESNT WOOORKKK. 
	// socket.on('ice config',ice_str=>{
	// 	if(ice_str.length == 0){
	// 		console.error('ice string is empty');
	// 		return;
	// 	}
	// 	config = JSON.parse(ice_str);
	// 	console.log(config);
	// });

	socket.emit('join room','test'); // server responds with 'all users'
	// ^^ IN REAL LIFE THIS WOULD BE FIRED ON ROOM FORM.SUBMISSION  
	socket.on('room full',()=>{
		console.error('the room you are trying to join is full');		
	});
	socket.on('all users',(users,prevUser,nextUser)=>{ // < me joining ...
		const peers = []; // this one is for media rendering on client side
		users.forEach(userId=>{ // !! << skipped when 1 user in room (users array empty)
			const peer = createPeer(userId,socket.id,myStream); // yourID myID mySTREAM
			peersRef.push({
				peerId:userId, //we make peer id same as socket id (remote peer, remote socket)
				peer // < the actual peer object
			});
			peers.push(peer); 	// << this is for rendering client side			
		});
		setPeer(peers);		// << this is for rendering client side 
	});

	socket.on('user joined',(payload,prevUser,nextUser)=>{ // < i'm already in, someone else joins ... 
		const peer = addPeer(payload.signal,payload.callerId,myStream); //signal object from remote, remote user id, my stream
		peersRef.push({
			peerId:payload.callerId,
			peer
		});
	});

	socket.on('receiving returned signal',payload=>{ // < JOINER returning signal :: answer signal
		const item = peersRef.find(p=>p.peerId === payload.id); // finding the peer we are receiving an answer from
		item.peer.signal(payload.signal);
	});

	socket.on('user left',(user,prevUser,NextUserId)=>{

	});

}).catch(err=>{
	console.error(err);
});

//we need a peer not per user but per connection 
function createPeer(userToSignal, callerId, stream){ // << called by joiner
	const peer = new Peer({
		config,
		initiator:true, // << because the entering user needs to let other know she joined
		trickle:false,
		iceTransportPolicy: 'relay',
		stream,  
	});

	peer.on('signal', signal=>{
		console.debug('got the offer', signal);
		socket.emit('sending signal', {userToSignal, callerId, signal}); // we send the signal to server & server passes the signal to specified remote user (via socket); 
	});

	peer.on('connect',()=>{
		console.debug('peer connection is ready',peer);
	});

	peer.on('error',err=>console.error(err));
	return peer;
}


function addPeer(incomingSignal, callerId, stream){ // << called by existing member
	const peer = new Peer({
		config,
		initiator:false,
		trickle:false,
		iceTransportPolicy: 'relay',
		stream,		
	});
	// 2. firing 'signal' event
	peer.on('signal', signal=>{ // triggered when remote peer is signaling with offer, sending answer signal back
		socket.emit('returning signal',{signal,callerId});
		console.debug('got the answer', signal);
	});
	// 1. called first
	peer.signal(incomingSignal); 

	peer.on('connect',()=>{
		console.debug('peer connection is ready',peer);
	});

	peer.on('error',err=>console.error(err));

	return peer;
}

function setPeer(){
	console.debug('called set peer fn');
}

/*
flow:
JOINER
	1.
	person joins room < initiator
	initiator socket: 'im joining!'
	io.server > sends array of room peers >to> init.socket 
		arr of socket ids
	for each socket id > create peer (with init)
	init peer > signal event > get signal > socket: send  offer signal >to> remote peer
	3.  
	wait for answer signal from remote peer (via socket)
	find peer the corresponding offer originated from 
	call peer.singal on received answer 
	4. 
	CONNECTED !

ALREADY IN
	2.
	socket "user joined!" with payload > signal obj and joiner id
	create non-initiating peer
	call .signal with offer received from joiner
	get answer signal from 'signal event'
	via socket : send answer signal >to> joiner	
	4.
	CONNECTED !
*/


//hmm, what happens when 1st user joins room ? 

// hmm, when do we add new user to user arr stored on server ??
// ^^ the array passed via 'all users' socket.event ?
// aha, joiner's id is added by server to user arrau
// ^^ but the server is passing it to joiner without joiner id (filtered).
// solution: i need it to be sent with joiner, filter it out in 'all user' event callback.





//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	
/*
	socket.on('startPeer',data=>{
			console.log(data);
			const peerId = data.peerId;
			const peer = new Peer({
				initiator: data.init,
				reconnectTimer: 3000,
		   		trickle: false,
				config: config,
				stream: myStream,
				// iceTransportPolicy: 'relay',
			});	

			//fired by init;
			peer.on('signal',signal_data=>{
				console.log(signal_data);
				socket.emit('signal',signal_data);
			});
			//fired by remote;
			socket.on('signal',data=>{
				console.log(data);
				peer.signal(data.signal);
			});

			peer.on('connect',()=>{
				console.log('peers connected');
			});

			peer.on('close',()=>{
				console.log('connection closed');
			});

			peer.on('error', err=>{
				console.log(err);
			});
	});

}).catch(err=>{
	console.error(err);
});

*/




	/*
	peer.on('signal', (data)=>{
		//on peer signalled , returns peer id 
		console.log('signal data: ', data);
		waitForPeer(data);
	});

	function waitForPeer(data){		
		socket.on('partnerEntered',()=>{
			console.log('other peer entered', data);
			socket.emit('signal',data);
		});
	}

	socket.on('signal',data=>{
		// new peer signalling #init
		peer.signal(data);
	});

	peer.on('connect',()=>{
		console.log('peer connection established');
	});

	peer.on('error', err=>{
		console.log('peer error: ',err);
	});
	*/


	/*
	document.getElementById('connect').addEventListener('click', ()=>{
		const otherId = JSON.parse(document.getElementById('otherId').value);
		// signallign the other peer, by id
		peer.signal(otherId);
	});

	document.getElementById('send').addEventListener('click', ()=>{
		const yourMessage = document.getElementById("yourMessage").value;
		console.log('o huj');
		peer.send(yourMessage);
	});

	peer.on('data', (data)=>{
		document.getElementById('messages').textContent += data + '\n';
	});	
	peer.on('stream', (theirStream)=>{
		console.log('got the stream');
		const video1 = document.createElement('video');
		video1.setAttribute('class', 'theirVideo');
		document.body.appendChild(video1);

		video1.srcObject = theirStream;
		video1.play();
		const video2 = document.createElement('video');
		video2.setAttribute('class', 'myVideo');
		document.body.appendChild(video2);
		video2.srcObject = myStream;
		video2.play();
	});
	*/



