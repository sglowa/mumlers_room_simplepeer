/*jshint esversion:6*/
const Bowser = require("bowser");
const helpers = require('./helpers');
const messages = require('./messages');
// old navigator.getUserMedia
// navigator.getUserMedia = ( navigator.getUserMedia ||
//                        navigator.webkitGetUserMedia ||
//                        navigator.mozGetUserMedia ||
//                        navigator.msGetUserMedia);

		//#0000ff change routes && index.pug 

const constraints = {
	audio : true,
	video : {
		width:{
			// exact:480,
			ideal:480
		},
		height:{
			// exact:320,
			ideal:320
		},
		framerate:18.00,
		resizeMode:"crop-and-scale"
	}
};

const browser = Bowser.getParser(window.navigator.userAgent)

if(!(browser.getBrowserName() == "Chrome" || browser.getBrowserName() == "Firefox")){
	messages.wrongBrowser('browser', browser);
	console.log('please use Chrome or Firefox');
	return;
}

if(browser.getPlatform().type != "desktop"){
	messages.wrongBrowser('platform', browser);
	console.log('please use desktop version of Chrome or Firefox');
	return;
}

navigator.mediaDevices.getUserMedia(constraints)
	.then(async myStream =>{
		helpers.removeOnce(document.querySelector('span.mediaReq'));		

		const {socket,lastId} = initSocket();

		const roomForm = require('./roomForm.js');			
		const roomName = await roomForm(socket);
		reconnectOpts(lastId,roomName,socket);
		const signalling_f = require('./signalling_front.js');
		const handleStreams = require('./handleStream.js');
		// #0000ff get waiting for others...
		// #0000ff get |chatInterface:roomLeft|disconnected|shareScreen|mute|roomName
		signalling_f(socket,roomName,myStream,handleStreams);		
		// handleStreams(socket,peersRef,myStream);

}).catch(err=>{
	messages.mediaNavFail();	
});

function initSocket(){
	let lastId = ''; 
	const socket = io(undefined,{query: {lastId}});	
	socket.on('connect',()=> lastId = lastId ? lastId : socket.id);
	return {socket,lastId}
}

function reconnectOpts(lastId,roomName,socket){
	socket.on('reconnect_attempt',()=>{
		console.log('reconnecting attempts');
		socket.io.opts.query = {lastId,roomName};
	})
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

//Questions
//hmm, what happens when 1st user joins room ? 
// hmm, when do we add new user to user arr stored on server ??
// ^^ the array passed via 'all users' socket.event ?
// aha, joiner's id is added by server to user arrau
// ^^ but the server is passing it to joiner without joiner id (filtered).
// solution: i need it to be sent with joiner, filter it out in 'all user' event callback.
