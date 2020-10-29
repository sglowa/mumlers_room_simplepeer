/*jshint esversion:6*/

const camFeedA_vid = document.createElement('video');
let camFeedA_stream = null;
const camFeedB_vid = document.createElement('video');	
let camFeedB_stream = null;
const camFeed_cnv = document.createElement('canvas');
const camFeed_ctx = camFeed_cnv.getContext('2d');
const camFeedComp_stream = camFeed_cnv.captureStream();
let camFeed_node = null;
let camFeedComp_isInit = false;
let camFeedComp_audio = null;
const scene_cnv = document.querySelector('canvas.scene');
const scene_vc = new VideoContext(scene_cnv);
scene_cnv.width = 720;
scene_cnv.height = 480;
const blenderNode = scene_vc.effect(require('./shader_descriptions').sixInputBlender);
blenderNode.connect(scene_vc.destination);
const fpsWorker = new Worker('./fps.js');
let nextPartnerId;

module.exports = async (signalClient,peer,peersRef,myStream)=>{

	console.log('handle stream called');
	if(!camFeedA_stream){
		camFeedA_stream = myStream;	
		camFeedComp_audio = camFeedA_stream.getAudioTracks()[0];
		if(camFeedComp_audio){
			camFeedComp_stream.addTrack(camFeedComp_audio);
			camFeedA_stream.removeTrack(camFeedComp_audio);
			camFeedA_vid.srcObject = camFeedA_stream;	
			await camFeedA_vid.play();	
		}		
	}	
	
	const newNextPartner = (newNextPartnerId)=>{
		if(newNextPartnerId !== nextPartnerId && newNextPartnerId != signalClient.id){
			if(nextPartnerId){ // only if there was already a partner
				const oldNextPartner = peersRef.array.find(p=>p.peerId == nextPartnerId);
				if(oldNextPartner) oldNextPartner.peer.removeStream(camFeedA_stream); // < making sure oldPartner hasnt disconnected
			}			
			const newNextPartner = peersRef.array.find(p=>p.peerId == newNextPartnerId);
			newNextPartner.peer.addStream(camFeedA_stream);
		}
		nextPartnerId = newNextPartnerId;
	};

	peer.once('stream',stream=>{
		console.log('receiving Comp Stream',stream); //<do something with compStream;
		addCompNode(stream);
	// 	▼▼ ghost stream ▼▼ 
		peer.on('stream',async stream=>{
/*#ff00ff*/	await Promise.all([IceConnectionPromise(peer),trackUnmutePromise(stream)]);
/*#ffff00*/	await new Promise((resolve,reject)=>{
				setTimeout(()=>{resolve();},2000);
			});
			if(stream.id == camFeedA_stream.id){
				setCamFeed_ctx(stream);
			}else{
				peer.addStream(stream);				
			}
		});
		signalClient.socket.emit('getNextPartner');
	});	

	signalClient.socket.on('nextPartner',nextPartnerId=>{
		newNextPartner(nextPartnerId);
	});

	peer.addStream(camFeedComp_stream);

	window.handleStream = {
	camFeedA_stream,
	camFeedA_vid,
	camFeedB_vid,
	camFeed_cnv,
	camFeed_ctx,
	camFeedComp_stream,
	scene_cnv,
	scene_vc
	}; //for debugging;
};


async function addCompNode(stream){	
	const vid = document.createElement('video'); // << this needs to be destroyed on peer leaves
	vid.srcObject = stream;
	await vid.play();
	const vidNode = scene_vc.video(vid);
	vidNode.start(0);
	vidNode.connect(blenderNode);
	if(scene_vc.state==0)return;
	scene_vc.play();
};

async function setCamFeed_ctx(stream){
	camFeedB_stream = stream;
	camFeedB_vid.srcObject = camFeedB_stream;
	await camFeedB_vid.play();			
	
	if(camFeedComp_isInit) return;
	camFeedComp_isInit = true;
	camFeed_cnv.width = camFeedA_vid.videoWidth;
	camFeed_cnv.height = camFeedA_vid.videoHeight;

	const render=()=>{
		camFeed_ctx.globalAlpha = 1.0;
		camFeed_ctx.drawImage(camFeedB_vid,0,0);
		camFeed_ctx.globalCompositeOperation='difference';
		camFeed_ctx.fillStyle='white';
		camFeed_ctx.fillRect(0,0,camFeed_cnv.width,camFeed_cnv.height);
		camFeed_ctx.globalCompositeOperation='source-over';
		camFeed_ctx.globalAlpha = 0.5;
		camFeed_ctx.drawImage(camFeedA_vid,0,0);
	};	
	fpsWorker.addEventListener('message',render);
	fpsWorker.postMessage('start');
	camFeed_node = scene_vc.canvas(camFeed_cnv);
	camFeed_node.start(0);
	camFeed_node.connect(blenderNode);

	let btn = document.createElement('button');
	btn.innerText = 'FULLSCREEN';
	document.body.appendChild(btn);
	btn.addEventListener('click',()=>{
		if(scene_cnv.classList.contains('fullscreen')){
			scene_cnv.classList.remove('fullscreen');	
		}else{
			scene_cnv.classList.add('fullscreen');	
		}
	});
}



function listenIceChange(peer){
	peer._pc.oniceconnectionstatechange = ()=>{
		console.log(`peer ICE state is ${peer._pc.iceConnectionState}`);
	};
	console.log(`peer ICE state is ${peer._pc.iceConnectionState}`);
} //purple debugging

function listenTrackMuted(stream){
	const vt = stream.getVideoTracks()[0];
	vt.onunmmute=()=>{
		console.log(`stream id: ${stream.id}`);
		console.log(`track mute status: ${vt.muted}`);
	};
	vt.onmute=()=>{
		console.log(`stream id: ${stream.id}`);
		console.log(`track mute status: ${vt.muted}`);
	};
	console.log(`stream id: ${stream.id}`);
	console.log(`track mute status: ${vt.muted}`);
} //purple debugging

function listenTrackDisabled(stream){
	const vt = stream.getVideoTracks()[0];
	console.log(`track enabled status: ${vt.enabled}`);
	if(!vt.enabled){
		const listen = setInterval(()=>{
			if(vt.enabled){
				console.log(`track enabled status: ${vt.enabled}`);
				clearInterval(listen);
			}
		},100);
	}
} //purple debugging

function getConnectionState(){
	return new Promise((resolve,reject)=>{
		const pc = peer._pc;
		if(pc.connectionState=='connected'||pc.connectionState=='completed'){
			resolve('connection ready');
		}
		pc.on('connectionstatechange',()=>{
			if(pc.connectionState=='connected'||pc.connectionState=='completed'){
				resolve('connection ready');
			}else if(pc.connectionState=='closed'){
				console.log('connection closed');
				reject();
			}
		});
	});
} //<< waiting for _pc.connectionState (useless ?) 

/*#ff00ff*/
function IceConnectionPromise(peer){
	const pc = peer._pc;
	return new Promise((resolve,reject)=>{
		if(pc.iceConnectionState == 'connected'||pc.iceConnectionState == 'completed'){
			resolve(pc.iceConnectionState);
		}
		pc.oniceconnectionstatechange = ()=>{
			if(pc.iceConnectionState == 'connected'||pc.iceConnectionState == 'completed'){
				resolve(pc.iceConnectionState);
			}else if(pc.iceConnectionState == 'closed'){
				reject(pc.iceConnectionState);
			}
		};
		const expire = setTimeout(()=>{
			reject('iceConnection expired');
		},10000);
	});
}
/*#ff00ff*/
function trackUnmutePromise(stream){
	return new Promise((resolve,reject)=>{
		const vt = stream.getVideoTracks()[0];
		if(!vt.muted)resolve('unmuted');
		const checkMuted = ()=>{
			setTimeout(()=>{
				if(!vt.muted){
					resolve('unmuted');
				}else{checkMuted();}
			},333);
		};
		checkMuted();
		const expire = setTimeout(()=>{
			reject('track unmute expired');
		},10000);
	});
}

