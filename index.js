/*jshint esversion:6*/
// this is client side js 
const helpers = require('./helpers');
const messages = require('./messages');

window.debugging = {};

let selectedVideoDeviceID = localStorage.getItem("preferredVideoDeviceId") || undefined;
debugging.selectedVideoDeviceID = localStorage.getItem("preferredVideoDeviceId") || undefined;
/**
 * Selects a video input device and stores the selection in localStorage.
 * @returns {Promise<void>}
 */
async function selectVideoDevice() {
    try {
        // Get available video input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            throw new Error("No video devices found.");
        }

        // Show available devices to the user (this could be a UI in a real app)
        const selectedDeviceId = prompt(
            "Select a video device by entering the index:\n" +
            videoDevices.map((device, index) => `${index}: ${device.label || 'Unnamed device'}`).join('\n')
        );

        const selectedDevice = videoDevices[selectedDeviceId];
        if (!selectedDevice) {
            throw new Error("Invalid selection.");
        }

        // Use the selected device
        // const stream = await navigator.mediaDevices.getUserMedia({
            // video: { deviceId: { exact: selectedDevice.deviceId } }
        // });

		selectedVideoDeviceID = selectedDevice.deviceId

		// Store the selected device in localStorage
        localStorage.setItem("preferredVideoDeviceId", selectedDevice.deviceId);
        console.log(`Selected device: ${selectedDevice.label}`);

    } catch (error) {
        console.error("Error selecting video device:", error);
    }
}
window.debugging.selectVideoDevice = selectVideoDevice;

/** @type {MediaStreamConstraints} constraints */
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
		resizeMode:"crop-and-scale",
		deviceId:{
			ideal:selectedVideoDeviceID
		}
	}
};

// purple debugging < save client console.log to file;
// helpers.saveConsoleLog(); 


function extraEntryPoint(normalEntryPoint){
	if(!document.currentScript.hasAttribute('extra')){
		normalEntryPoint();
		return;
	}

	console.log(document.currentScript.getAttribute('extra'))
	const extraEntryPoints = {
		schedule:()=>{
			const {showPopUp,showSchedule} = require('./schedule_src/schedule_f.js');
			showPopUp('/schedulePopUp',()=>{showSchedule(isCompatible)},()=>{isCompatible()});
		}
	}
	const extra = document.currentScript.getAttribute('extra');
	extraEntryPoints[extra]();
}
extraEntryPoint(isCompatible);

function isCompatible(){
	try{
		helpers.checkPlatform(document.querySelector('span.mediaReq'));
		startCam();
	}catch(e){
		console.log(e);
		return;
	}
}

function startCam(){
	document.querySelector('span.mediaReq').style.display = "unset";
	navigator.mediaDevices.getUserMedia(constraints)
		.then(async myStream =>{
			helpers.removeOnce(document.querySelector('span.mediaReq'));		

			const socket = initSocket();

			const roomForm = require('./roomForm.js');			
			const roomName = await roomForm(socket);
			reconnectOpts(roomName,socket);
			const signalling_f = require('./signalling_front.js');
			const handleStreams = require('./handleStream.js');
			// #0000ff get waiting for others...
			// #0000ff get |chatInterface:roomLeft|disconnected|shareScreen|mute|roomName
			signalling_f(socket,roomName,myStream,handleStreams);		
	}).catch(err=>{
		messages.mediaNavFail();	
	});
}

let lastId = ''; 
function initSocket(){
	const socket = io(undefined,{query: {lastId}});	
	socket.on('connect',()=> lastId = lastId ? lastId : socket.id);
	return socket;
}

function reconnectOpts(roomName,socket){
	socket.on('reconnect_attempt',()=>{
		// console.log('reconnecting attempts');
		console.count('reconnect attempt')
		socket.io.opts.query = {lastId};
		// socket.emit('reconnect_attempt',{lastId,roomName});
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
