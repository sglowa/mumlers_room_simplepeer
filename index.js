/*jshint esversion:6*/

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

navigator.mediaDevices.getUserMedia(constraints)
	.then(async myStream =>{
		document.querySelector('span.mediaReq').parentElement.removeChild(document.querySelector('span.mediaReq'));
		/*
		// #872735#872735#872735 forTesting
		const replaceStreamForTesting = async x=>{
			const vtOld = myStream.getVideoTracks()[0];
			const tempVid = document.createElement('video');
			tempVid.src = `./tempVideos/${x}.mp4`;
			tempVid.loop = true;
			await tempVid.play();
			const tempStr = tempVid.captureStream();
			const vtNew = tempStr.getVideoTracks()[0];
			myStream.removeTrack(vtOld);
			myStream.addTrack(vtNew);
		};
		const btn = document.createElement('button');
		btn.innerText = 'change track';
		const menu = document.createElement('select');
		for (var i = 1; i <= 4; i++) {
			let option = document.createElement('option');
			option.value = i+'';
			option.innerText = option.value;
			menu.appendChild(option);
		}
		document.body.appendChild(menu);
		document.body.appendChild(btn);
		btn.onclick = ()=>{
			replaceStreamForTesting(menu.value);
		};
		// #872735#872735#872735 */

		const  socket = io();
		socket.on('connect',()=>console.log('socket connected'));
		const roomForm = require('./roomForm.js');			
		const roomName = await roomForm(socket);
		// #0000ff ^ i need to style this. 
		const signalling_f = require('./signalling_front.js');
		const handleStreams = require('./handleStream.js');
		// #0000ff get waiting for others...
		// #0000ff get |chatInterface:roomLeft|disconnected|shareScreen|mute|roomName
		signalling_f(socket,roomName,myStream,handleStreams);		
		// handleStreams(socket,peersRef,myStream);

	}).catch(err=>{
		document.querySelector('span.mediaReq').parentElement.removeChild(document.querySelector('span.mediaReq'));
		// #0000ff serve error page.
		const errMsg = document.createElement('span'); 
		errMsg.className = 'err';
		errMsg.innerHTML = '<span>Error</span><br><span>This site requires a webcam and a microphone.<br>Please, refresh the website and enable webcam and mic.</span>';
		const mainContent = document.querySelector('.main-content');
		mainContent.appendChild(errMsg);
	});


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
