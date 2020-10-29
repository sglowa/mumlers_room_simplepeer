/*jshint esversion:6*/
window.getMembers = ()=>{ // for debugging
	console.log(peersRef);
};

const peersRef = {array:[]}; // locally stored array of peers in the room [{peerId:"",peer:{}}]

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
	
	const signalClient = new SimpleSignalClient(socket,{connectionTimeout:33333});
	
	async function connectToPeer(peerId){
		console.log('connecting to peer',signalClient);
		const {peer} = await signalClient.connect(peerId,currentRoom,options); // why am i sending current room ?
		peersRef.array.push({peer,peerId});
		console.log('connected to peer', peer);
		handleStreams(signalClient,peer,peersRef,myStream);
	}

	function joinRoom(discoveryData){
		if(discoveryData.roomName == name){
			console.log(discoveryData);
			signalClient.removeListener('discover',joinRoom);
			discoveryData.members.forEach(peerId=>{
				connectToPeer(peerId);
			});
		}
	}
	currentRoom = name;
	signalClient.on('request',async request=>{
		console.log('connecting to peer',signalClient);
		const {peer} = await request.accept(null,options);
		peersRef.array.push({peer,peerId:request.initiator});
		console.log('connected to peer', peer);
		handleStreams(signalClient,peer,peersRef,myStream);
	});
	signalClient.addListener('discover',joinRoom);
	signalClient.discover(name);
};