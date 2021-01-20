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


// xirsys stun/turn config 1
/*
let config = {"iceServers" : [
		{urls: [ "stun:eu-turn2.xirsys.com" ]},
		{urls: ['stun:stun.l.google.com:19302']},
		{username: "DhZKBos2ZBjkR6rB4RzhDu6rSVpWIWDLUZJWQhBYDDVGBtb5qcdVUtGYow26onscAAAAAF-DEjZjemFqbmljemVr",
	   	credential: "71ed90ba-0bcb-11eb-b26b-0242ac140004",
	   	urls: [
	       "turn:eu-turn2.xirsys.com:80?transport=udp",
	       "turn:eu-turn2.xirsys.com:3478?transport=udp",
	       "turn:eu-turn2.xirsys.com:80?transport=tcp",
	       "turn:eu-turn2.xirsys.com:3478?transport=tcp",
	       "turns:eu-turn2.xirsys.com:443?transport=tcp",
	       "turns:eu-turn2.xirsys.com:5349?transport=tcp"
	   	]},

	    {urls: ['turn:numb.viagenie.ca:3478?transport=udp',
	    		'turn:numb.viagenie.ca:3478?transport=tcp'], //?transport=tcp
	   	username: 's9lowacki@gmail.com',
	    credential: 'testingtestint'
		}	    
	]};
*/

// xirsys stun/turn config 2
/*
let config = {"iceServers": [
	{urls: [ "stun:eu-turn8.xirsys.com" ]}, 
   	{username: "_CinuHeBH_T_LYbsBQHaCxC-7VRpUTVYScP-FE8RZSaz60P9mnm2mE_Watt_PnIQAAAAAF-_ygNtdW1sZXIx",
   	credential: "45ba51c2-2ffc-11eb-9f2b-0242ac140004",
   	urls: [
       "turn:eu-turn8.xirsys.com:80?transport=udp",
       "turn:eu-turn8.xirsys.com:3478?transport=udp",
       "turn:eu-turn8.xirsys.com:80?transport=tcp",
       "turn:eu-turn8.xirsys.com:3478?transport=tcp",
       "turns:eu-turn8.xirsys.com:443?transport=tcp",
       "turns:eu-turn8.xirsys.com:5349?transport=tcp"
   	]}
]};
*/

// xirsys stun/turn config 2

let config = {
	"iceServers": [
		{urls: [ "stun:eu-turn1.xirsys.com" ]},
		{
			username: "GjqgkNQlbGabDKvtTV7QPiN2VGPSx23wxWngq8KXNfs8gV3YFdNIDpRETzBgLCT8AAAAAF_gzvJtdW1sZXIz",
			credential: "9d1ff626-43aa-11eb-9bf0-0242ac140004",
			urls: [
			    "turn:eu-turn1.xirsys.com:80?transport=udp",
			    "turn:eu-turn1.xirsys.com:3478?transport=udp",
			    "turn:eu-turn1.xirsys.com:80?transport=tcp",
			    "turn:eu-turn1.xirsys.com:3478?transport=tcp",
			    "turns:eu-turn1.xirsys.com:443?transport=tcp",
			    "turns:eu-turn1.xirsys.com:5349?transport=tcp"
			]
	   	}
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
	let msgElem;
	
	const signalClient = new SimpleSignalClient(socket,{connectionTimeout:33333});
	
	async function connectToPeer(peerId){
		console.log('connecting to peer (joiner)',signalClient);
		const {peer} = await signalClient.connect(peerId,currentRoom,options); // why am i sending current room ?
		peersRef.array.push({peer,peerId});
		console.log('connected to peer', peer);		
		helpers.removeOnce(msgElem);
		handleStreams(signalClient,peer,peersRef,myStream,name);
	}

	function joinRoom(discoveryData){		
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
	document.body.appendChild(msg);
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

function waitingMsg(name){
	const msg = document.createElement('span');
	document.body.appendChild(msg);
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
