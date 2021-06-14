/*jshint esversion:6*/

const helpers = require('./helpers');
const messages = require('./messages');
const chatInterface = require('./chatInterface');
const SimpleSignalClient = require('simple-signal-client');

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
				   	], 
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

module.exports = (socket,roomName,myStream,handleStreams)=>{	
	console.log('running signalling front');
	let msgElem; 
	
	const signalClient = new SimpleSignalClient(socket,{connectionTimeout:33333});
	
	async function connectToPeer(peerId){
		console.log('connecting to peer (joiner)',signalClient);
		const {peer} = await signalClient.connect(peerId,roomName,options); // why am i sending current room ?
		peersRef.array.push({peer,peerId}); // add myself
		console.log('connected to peer', peer);		
		helpers.removeOnce(msgElem);
		handleStreams(signalClient,peer,peersRef,myStream,roomName);
	}

	function joinRoom(discoveryData){
		chatInterface.setRoomName(roomName);		
		if(discoveryData.roomName == roomName){
			msgElem = messages.joiningMsg(roomName);
			console.log(discoveryData);
			signalClient.removeListener('discover',joinRoom);
			discoveryData.members.forEach(peerId=>{
				connectToPeer(peerId);
			});
			if(!discoveryData.members.length){
				helpers.removeOnce(msgElem);
				msgElem = messages.waitingMsg();
			}			
		}
	}

	signalClient.on('request',async request=>{
		console.log('connecting to peer (member)',signalClient);
		const {peer} = await request.accept(null,options);
		peersRef.array.push({peer,peerId:request.initiator});
		console.log('connected to peer', peer);
		helpers.removeOnce(msgElem);
		handleStreams(signalClient,peer,peersRef,myStream);
	});
	signalClient.addListener('discover',joinRoom);
	signalClient.discover(roomName);
};

// ~~~~~~~~ debugging ~~~~~~~~~~~~~~
window.debugging.getMembers = ()=>{ // for debugging
	return peersRef;
};