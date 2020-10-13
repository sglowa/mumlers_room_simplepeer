/*jshint esversion:6*/
window.getMembers = ()=>{ // for debugging
	console.log(peersRef);
};
const Peer = require('simple-peer');
const peersRef = {array:[]}; // locally stored array of peers in the room [{peerId:"",peer:{}}]
// ^^object, to keep reference as it's passed outside of scope
const stream = require('./helpers.js').makeEmptyStream({width:480,height:320});

// viagenie stun/turn config
// let config  = {'iceServers': [
// 				   { urls: ['stun:stun.l.google.com:19302']},
// 				   { urls: ['turn:numb.viagenie.ca:3478'], //?transport=tcp
// 				   	username: 's9lowacki@gmail.com',
// 				    credential: 'testingtestint'}
// 				    ]
// 				};

// xirsys stun/turn config
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

// TRYING TO GET CONFIG VIA API, DOESNT WOOORKKK... BUT SHOULD !
// A PROBLEM WITH HTTPS.REQUEST < socket err
// socket.on('ice config',ice_str=>{
// 	if(ice_str.length == 0){
// 		console.error('ice string is empty');
// 		return;
// 	}
// 	config = JSON.parse(ice_str);
// 	console.log(config);
// });
module.exports = (socket)=>{
	socket.on('room full',()=>{
		console.error('the room you are trying to join is full');		
	});
	socket.on('all users',(users)=>{ // < me joining ...
		const peers = []; // this one is for media rendering on client side
		users.forEach(userId=>{ // !! << skipped when 1 user in room (users array empty)
			const peer = createPeer(userId,socket.id,stream); // yourID myID mySTREAM
			peersRef.array.push({
				peerId:userId, //we make peer id same as socket id (remote peer, remote socket)
				peer // < the actual peer object
			});
			peers.push(peer); 	// << this is for rendering client side			
		});		
	});

	socket.on('user joined',(payload)=>{ // < i'm already in, someone else joins ... 
		const peer = addPeer(payload.signal,payload.callerId,stream); //signal object from remote, remote user id, my stream
		peersRef.array.push({
			peerId:payload.callerId,
			peer
		});
	});

	socket.on('receiving returned signal',payload=>{ // < JOINER returning signal :: answer signal
		const item = peersRef.array.find(p=>p.peerId === payload.id); // finding the peer we are receiving an answer from
		item.peer.signal(payload.signal);
	});

	socket.on('receiver renegotiating signal',payload=>{
		const item = peersRef.array.find(p=>p.peerId === payload.id); // finding the peer we are receiving an answer from	
		item.peer.signal(payload.signal);
	});

	socket.on('user left',(userId)=>{
		peersRef.array = peersRef.array.filter(user=>user.peerId!=userId);
	});

	//called by joiner. 
	function createPeer(userToSignal, callerId, stream){ // << called by joiner
		const peer = new Peer({
			config,
			initiator:true, // << because the entering user needs to let other know she joined
			trickle:false,
			iceTransportPolicy: 'relay',
			stream,  
		});
		let isConnected = false;
		peer.on('signal', signal=>{
			console.debug('got the offer', signal);
			// const peer = peersRef.array.find(p=>p.peerId==userToSignal); // checking if peer already exists
			if(isConnected){
				socket.emit('caller renegotiating', {userToSignal,callerId, signal});
				return;
			}
			socket.emit('sending signal', {userToSignal, callerId, signal}); // we send the signal to server & server passes the signal to specified remote user (via socket); 
		});		

		peer.on('connect',()=>{
			console.debug('peer connection is ready',peer);
			isConnected = true;
		});

		peer.on('stream',()=>{
			const peerId = peersRef.array.find(p=>p.peer==peer).peerId;
			socket.emit('receiving stream',{peerId,stream});
			console.log('receiving stream',stream);

		});

		peer.on('error',err=>console.error(err));
		return peer;
	}

	//called by member.
	function addPeer(incomingSignal, callerId, stream){ // << called by existing member
		const peer = new Peer({
			config,
			initiator:false,
			trickle:false,
			iceTransportPolicy: 'relay',
			stream,		
		});
		let isConnected = false;
		// 2. firing 'signal' event
		peer.on('signal', signal=>{ // triggered when remote peer is signaling with offer, sending answer signal back
			// const peer = peersRef.array.find(p=>p.peerId==callerId);
			if(isConnected){
				socket.emit('receiver renegotiating',{callerId, signal});
				return;
			} // checking if peer already exists
			socket.emit('returning signal',{signal,callerId});
			console.debug('got the answer', signal);
		});
		// 1. called first

		socket.on('caller renegotiating signal',payload=>{
			peer.signal(payload.signal);
		});

		peer.signal(incomingSignal); 

		peer.on('connect',()=>{
			isConnected = true;
			console.debug('peer connection is ready',peer);			
		});

		peer.on('stream',stream=>{
			const peerId = peersRef.array.find(p=>p.peer==peer).peerId;
			socket.emit('receiving stream',{peerId,stream});
			console.log('receiving stream',stream);
		});

		peer.on('close',()=>{
			const peerId = peersRef.array.find(p=>p.peer==peer).peerId;
			socket.emit('peer left',peerId);
		});

		peer.on('error',err=>console.error(err));

		return peer;
	}

	return peersRef;
};