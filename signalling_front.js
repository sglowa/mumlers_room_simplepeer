/*jshint esversion:6*/
window.getMembers = ()=>{ // for debugging
	console.log(peersRef);
};

const helpers = require('./helpers');
const peersRef = {array:[]}; // locally stored array of peers in the room [{peerId:"",peer:{}}]

// viagenie stun/turn config
// let config  = {'iceServers': [
// 				   { urls: ['stun:stun.l.google.com:19302']},
// 				   { urls: ['turn:numb.viagenie.ca:3478'], //?transport=tcp
// 				   	username: 's9lowacki@gmail.com',
// 				    credential: 'testingtestint'}
// 				    ]
// 				};


// xirsys stun/turn config 4
// let config = {
// 	'iceServers': [{
// 	   urls: [ "stun:eu-turn8.xirsys.com" ]
// 	}, {
// 	   username: "T6u8my3HMaEXaI2VPG2OFJyL3AUcJY4FniH0daUzecuD6EWwtQPPlMku6ZMtYTpJAAAAAGArcSZtdW1sZXI1",
// 	   credential: "cc30a37c-7026-11eb-8999-0242ac140004",
// 	   urls: [
// 	       "turn:eu-turn8.xirsys.com:80?transport=udp",
// 	       "turn:eu-turn8.xirsys.com:3478?transport=udp",
// 	       "turn:eu-turn8.xirsys.com:80?transport=tcp",
// 	       "turn:eu-turn8.xirsys.com:3478?transport=tcp",
// 	       "turns:eu-turn8.xirsys.com:443?transport=tcp",
// 	       "turns:eu-turn8.xirsys.com:5349?transport=tcp"
// 	   ]
// 	}]
// };


// !!!! xirsys stun/turn config 5
// let config = {
// 	'iceServers': [{
// 	   urls: [ "stun:eu-turn6.xirsys.com" ]
// 	}, {
// 	   username: "FWS_MGPRIwLYmNlH61QjYBTc5FNerToGrcSbovQ20JNKTjufIGqBLf8yvd-bAkNwAAAAAGA4-gltdW1sZXI2",
// 	   credential: "0834c1a0-7838-11eb-a49a-0242ac140004",
// 	   urls: [
// 	       "turn:eu-turn6.xirsys.com:80?transport=udp",
// 	       "turn:eu-turn6.xirsys.com:3478?transport=udp",
// 	       "turn:eu-turn6.xirsys.com:80?transport=tcp",
// 	       "turn:eu-turn6.xirsys.com:3478?transport=tcp",
// 	       "turns:eu-turn6.xirsys.com:443?transport=tcp",
// 	       "turns:eu-turn6.xirsys.com:5349?transport=tcp"
// 	   ]
// 	}]
// };

let config  = {'iceServers': [
				   { urls: ['stun:157.230.114.158:3478']},
				   { urls: [
				   		'turn:157.230.114.158:3478?transport=udp',
				   		'turn:157.230.114.158:3478?transport=tcp',
				   		'turn:157.230.114.158:5349?transport=tcp',
				   	], //?transport=tcp
				   	username: 'test',
				    credential: 'test123'}
				    ]
				};



// TRYING TO GET CONFIG VIA API, DOESNT WOOORKKK... BUT SHOULD !
// A PROBLEM WITH HTTPS.REQUEST < socket err
// socket.on('ice config',ice_str=>{
// 	if(ice_str.length == 0){
// 		console.error('ice string is empty');
// 		return;
// 	}
// 	config = JSON.parse(ice_str);
// 	console.log(config);
// }); //xirsys api << 
const options = {
	config,
	trickle:false,
	iceTransportPolicy: 'relay',
};
let currentRoom; 
const SimpleSignalClient = require('simple-signal-client');

module.exports = (socket,name,myStream,handleStreams)=>{	
	console.log('running signalling front');
	let msgElem, roomNameElem;
	
	const signalClient = new SimpleSignalClient(socket,{connectionTimeout:33333});
	
	async function connectToPeer(peerId){
		console.log('connecting to peer (joiner)',signalClient);
		const {peer} = await signalClient.connect(peerId,currentRoom,options); // why am i sending current room ?
		peersRef.array.push({peer,peerId});
		console.log('connected to peer', peer);		
		helpers.removeOnce(msgElem);
		// helpers.removeOnce(roomNameElem);
		handleStreams(signalClient,peer,peersRef,myStream,name);
	}

	function joinRoom(discoveryData){
		roomNameElem = displayName(name);		
		if(discoveryData.roomName == name){
			msgElem = joiningMsg(name);
			console.log(discoveryData);
			signalClient.removeListener('discover',joinRoom);
			discoveryData.members.forEach(peerId=>{
				connectToPeer(peerId);
			});
			if(!discoveryData.members.length){
				helpers.removeOnce(msgElem);
				msgElem = waitingMsg();
			}			
		}
	}

	currentRoom = name;
	signalClient.on('request',async request=>{
		console.log('connecting to peer (member)',signalClient);
		const {peer} = await request.accept(null,options);
		peersRef.array.push({peer,peerId:request.initiator});
		console.log('connected to peer', peer);
		helpers.removeOnce(msgElem);
		handleStreams(signalClient,peer,peersRef,myStream);
	});
	signalClient.addListener('discover',joinRoom);
	signalClient.discover(name);
};

function joiningMsg(name){
	const msg = document.createElement('span');
	document.querySelector('.main-content').appendChild(msg);
	msg.className = 'info joining';
	msg.innerText = `Joining ${name}.`;
	let count = 0;
	const interval = setInterval(()=>{
		if(count==2){
			count=0;
			msg.innerText = `Joining ${name}.`;
			return;
		}
		msg.innerText+='.';
		count++;
	},500);
	return msg;
}

function waitingMsg(){
	const msg = document.createElement('span');
	document.querySelector('.main-content').appendChild(msg);
	msg.className = 'info waiting';
	msg.innerText = `Waiting for someone.`;
	let count = 0;
	const interval = setInterval(()=>{
		if(count==2){
			count=0;
			msg.innerText = `Waiting for someone.`;
			return;
		}
		msg.innerText+='.';
		count++;
	},500);
	return msg;
}

function displayName(name){
	require('./chatInterface').setRoomName(name);
	const div = document.createElement('div');
	div.className = 'top';
	nameDiv = document.createElement('div');
	nameDiv.className = 'roomName';
	nameDiv.classList.add('fading');
	nameDiv.innerText = name;
	div.appendChild(nameDiv);
	document.querySelector('.main-content').appendChild(div);
	nameDiv.addEventListener('click',()=>{
		navigator.clipboard.writeText(name);
		if(nameDiv.classList.contains('roomAnim'))nameDiv.classList.toggle('roomAnim');
		setTimeout(()=>{
			nameDiv.classList.toggle('roomAnim');	
		},10);
	});
	return div;
}
