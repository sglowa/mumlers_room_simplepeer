/*jshint esversion:6*/

const socket = io();

socket.on('connect',()=>{
	console.log('socket connected');
	socket.emit('partnerEntered');
});

navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

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
	}
};

const config  = {'iceServers': [
				   { url: 'stun:stun.l.google.com:19302' },
				   { url: 'turn:numb.viagenie.ca?transport=udp',
				   	username: 's9lowacki@gmail.com',
				    credential: 'testingtestint'}
			 	]};

navigator.getUserMedia(constraints,(myStream)=>{
	const Peer = require('simple-peer');
	const peer = new Peer({
		initiator: location.hash === '#init',
		reconnectTimer: 3000,
      	// iceTransportPolicy: 'relay',
		// trickle: false,
		config: config,
		stream: myStream
	});	


	peer.on('signal', (data)=>{
		//on peer signalled , returns peer id 
		console.log('signal data: ', data);
		waitForPeer(data);
	});

	function waitForPeer(data){
		socket.on('partnerEntered',()=>{
			socket.emit('signal',data);
		});
	}

	socket.on('signal',data=>{
		peer.signal(data);
	});

	peer.on('connect',()=>{
		console.log('peer connection established');
	});

	peer.on('error', err=>{
		console.log('peer error: ',err);
	});


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


},(err)=>{
	console.log(err);
});
