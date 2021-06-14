/*jshint esversion:6*/
const chatInterface = require('./chatInterface');

const camFeedA_vid = document.createElement('video');
let camFeedA_stream = null;
const camFeedB_vid = document.createElement('video');	
let camFeedB_stream = null;
const camFeed_cnv = document.createElement('canvas');
const camFeed_ctx = camFeed_cnv.getContext('2d');
const camFeedComp_stream = camFeed_cnv.captureStream(18);
let camFeed_node = null;
let camFeedComp_isInit = false;
let camFeedComp_audio = {data:null};
const scene_cnv = document.querySelector('canvas.scene');
const scene_vc = new VideoContext(scene_cnv);
scene_cnv.width = 720;
scene_cnv.height = 480;
const blenderNode = scene_vc.effect(require('./shader_descriptions').tenInputBlender);
blenderNode.connect(scene_vc.destination);
// const fpsWorker = new Worker('./fps.js');
let nextPartnerId;
let receivedCamFeedB = false;

//orange this is called on each peer connection  
module.exports = async (signalClient,peer,peersRef,myStream,roomName)=>{	

	const newNextPartner = newNextPartnerId=>{
		if(newNextPartnerId !== nextPartnerId && newNextPartnerId != signalClient.id){
			if(nextPartnerId && peersRef.array.find(i=>i.peerId==nextPartnerId) != null){ // only if there was already a partner and partner hasn't just left
				const oldNextPartner = peersRef.array.find(p=>p.peerId == nextPartnerId);
				if(oldNextPartner){
					oldNextPartner.peer.removeStream(camFeedA_stream); // < making sure oldPartner hasnt disconnected
					console.log('stream removed from old partner')	
				} 
			}			
			const newNextPartner = peersRef.array.find(p=>p.peerId == newNextPartnerId);
			// await Promise.all([IceConnectionPromise(peer),trackUnmutePromise(stream)]);
/*red*/		newNextPartner.peer.addStream(camFeedA_stream); // < option : i'm not updating stream sent to partner
			receivedCamFeedB = false; // freezing camFeedComp till camFeedB is received
			console.log('sending my stream to partner');
		}
		nextPartnerId = newNextPartnerId;
		chatInterface.setNextPartner(nextPartnerId);
	};

	// #0000ff  show chatInterface
	chatInterface.constructInterfaceOnce(signalClient,myStream,camFeedComp_audio,peersRef);

	console.log('handle stream called');
	// orange called once, should be once
	if(!camFeedA_stream){
		camFeedA_stream = myStream;	
		camFeedComp_audio.data = camFeedA_stream.getAudioTracks()[0];
		if(camFeedComp_audio.data){
			camFeedComp_stream.addTrack(camFeedComp_audio.data);
			camFeedA_stream.removeTrack(camFeedComp_audio.data);
			camFeedA_vid.srcObject = camFeedA_stream;	
			camFeedA_vid.play();	
		}		
	}	

	// orange hooked per peer, should be per peer
	peer.on('data',data=>{
		data = data+'';
		if(data != 'ready for partner streams') return;
		if((peersRef.array.length == 1 && peer.initiator)||peersRef.array.length > 1){
			signalClient.socket.emit('getNextPartner');
		}			
	});

	// orange hooked per peer, should hook once
	if(!signalClient.socket.listeners('nextPartner').length){
		signalClient.socket.on('nextPartner',nextPartnerId=>{
			newNextPartner(nextPartnerId);
		});	
	}
	
	// orange once per peer, should be once per peer
	peer.once('stream',stream=>{
		console.log('receiving Comp Stream',stream);
		addCompNode(stream).then(r=>{	// <<==▼▼ adding CompVidElem to memberObject in peersRef[] (to easily delete on peer left)		
			const p = peersRef.array.find(p=>p.peer == peer);
			Object.assign(p,r);
		}); 

	// 	▼▼ ghost stream ▼▼ 
		peer.on('stream',async stream=>{
			console.log('receiving stream');
/*#ff00ff*/	await Promise.all([IceConnectionPromise(peer),trackUnmutePromise(stream)]);
			if(stream.id == camFeedA_stream.id){
				console.log('receiving my stream');
				receivedCamFeedB = true;
				setCamFeed_ctx(stream);
			}else{
/*red*/			console.log('receiving partner stream, bouncing back'); //< option :partner is not updating track on stream he sends back
				peer.addStream(stream);
				if(peersRef.array.length == 1 && !peer.initiator){ // if room has only 2.
				await new Promise((resolve,reject)=>{
						setTimeout(()=>{resolve();},1000);
					}); 										/*y is it all here ?*/
					signalClient.socket.emit('getNextPartner');	/*#ffff00*/
				}
			}
		});
		peer.send('ready for partner streams');
	});	
	
	// orange per peer, should be per peer
	peer.addStream(camFeedComp_stream);

	// pausing streams when peer looses connection // #009999 
	peer._pc.onconnectionstatechange = ()=>{
		console.log('connection state changed: ', peer._pc.connectionState);
		const {vidElem} = peersRef.array.find(i=>i.peer == peer)
		if(peer._pc.connectionState == 'disconnected'){
			// pause peers feed
			if(vidElem && !vidElem.paused)vidElem.pause()

			// if peer is my partner => pause my feed (by reassignign renderCnv() )
		}
		if(peer._pc.connectionState == 'connected'){
			if(vidElem && vidElem.paused)vidElem.play();
		}
	}

	peer.on('error',e=>{
		console.log('peer error: ',e);
		signalClient.socket.once('is socket in room', r=>{
			if(!r){
				console.log('socket not in room');	
			}else{
				console.log('socket is in room');
				console.log(r.name, r.members);
			}
		})
		signalClient.socket.emit('is socket in room');
	})


	// orange hooks per peer, should hook once || DONE! << need to test 
	// orange but also : removes leaving peer from array; then
	//	calls newNextPartner
	if(!signalClient.socket.listeners('peer left').length){
		signalClient.socket.on('peer left',whoLeft=>{
			const i = peersRef.array.findIndex(p=>p.peerId==whoLeft);
			if(i>=0){
				if(peersRef.array[i].vidElem)peersRef.array[i].vidElem.pause();
				if(peersRef.array[i].vidNode)peersRef.array[i].vidNode.destroy();
				if(peersRef.array[i].peer)peersRef.array[i].peer.destroy();
				peersRef.array.splice(i,1);
				if(nextPartnerId == whoLeft)signalClient.socket.emit('getNextPartner');	
			}
			if(!peersRef.array.length){ // if 1 in room 
				console.warn("you're alone again") // !!!!
			}
		});
	}	

	if(!signalClient.socket.listeners('error').length){
		signalClient.socket.on('error',e=>{
			console.log('error: ', e);
		})
	}


	if(!signalClient.socket.listeners('reconnect').length){
		signalClient.socket.on('reconnect',()=>{
			signalClient.socket.once('readmitted',()=>{
				console.log('socket readmitted');
			})
			signalClient.socket.emit('readmit',roomName); //	#88ddff readmit
			console.log('reconnect successful');
		})
	}

	if(!signalClient.socket.listeners('reconnect_error').length){
		signalClient.socket.on('reconnect_error',e=>{
			console.log('reconnect_error: ', e);
		})
	}

	if(!signalClient.socket.listeners('reconnect_failed').length){
		signalClient.socket.on('reconnect_failed',()=>{
			console.log('reconnect_failed: ');
		})
	}

	window.handleStream = {
	camFeedA_stream,
	camFeedA_vid,
	camFeedB_vid,
	camFeed_cnv,
	camFeed_ctx,
	camFeedComp_stream,
	scene_cnv,
	scene_vc,
	signalClient,
	myStream,
	nextPartnerId,
	wrapInVid : require('./helpers.js').wrapInVideo
	};
	window.debugging.getSocketId = ()=>{
	 	signalClient.socket.emit('get socket id');
	};
	//for debugging;
};


async function addCompNode(stream){	
	const vidElem = document.createElement('video'); // << this needs to be destroyed on peer leaves
	vidElem.srcObject = stream;
	await vidElem.play();
	const vidNode = scene_vc.video(vidElem);
	vidNode.start(0);
	vidNode.connect(blenderNode);
	if(!scene_vc.state==0) scene_vc.play();	
	return {vidElem,vidNode};
};

async function setCamFeed_ctx(stream){
	camFeedB_stream = stream;
	camFeedB_vid.srcObject = camFeedB_stream;
	await camFeedB_vid.play();			
	
	if(camFeedComp_isInit) return;
	camFeedComp_isInit = true;
	camFeed_cnv.width = camFeedA_vid.videoWidth;
	camFeed_cnv.height = camFeedA_vid.videoHeight;

	const renderCnvSuspended = ()=>{};
	const renderCnvNormal = ()=>{
		if(!receivedCamFeedB)return;
		camFeed_ctx.globalAlpha = 1.0;
		camFeed_ctx.drawImage(camFeedB_vid,0,0,camFeed_cnv.width,camFeed_cnv.height);
		camFeed_ctx.globalCompositeOperation='difference';
		camFeed_ctx.fillStyle='white';
		camFeed_ctx.fillRect(0,0,camFeed_cnv.width,camFeed_cnv.height);
		camFeed_ctx.globalCompositeOperation='source-over';
		camFeed_ctx.globalAlpha = 0.5;
		camFeed_ctx.drawImage(camFeedA_vid,0,0,camFeed_cnv.width,camFeed_cnv.height);
	};
	let renderCnv = renderCnvNormal;

	let render = ()=>{
		renderCnv();
		requestAnimationFrame(render);		
	};
	requestAnimationFrame(render);
	
	const getPageVis = require('./helpers.js').getPageVis;
	({hidden,visibilityChange} = getPageVis());
	let fpsWorker;

	const handleVisibilityChange = ()=>{
		if(document[hidden]){
			console.log('switching to worker');
			//switch to worker 
				//q : spawn new one OR start/stop 1 constantly running;			
			if(fpsWorker==undefined){
				fpsWorker = new Worker('./fps.js');
				fpsWorker.addEventListener('message',render);
			}
			render = renderCnv;
			fpsWorker.postMessage('start');
		}else{
			console.log('switching to RAF');
			// switch to RAF
			if(fpsWorker!==undefined) fpsWorker.postMessage('stop');
			render = ()=>{
				renderCnv();
				requestAnimationFrame(render);
			};
			requestAnimationFrame(render);
		}
	};

	if (typeof document.addEventListener === "undefined" || hidden === undefined) {
	  console.log("your browser isnt supported, pls use Chrome or Firefox");
	} else {
	  // Handle page visibility change
	  document.addEventListener(visibilityChange, handleVisibilityChange, false);
	}

	/*red
	okok. actually no > the helper function should return the name of the prop and event,
	the callback logic can be here. 
	if visible {
		if worker on 
			remove worker
		set RAF rendering 	
	} else if hidde{
		if RAF on {
			stop RAF rendering
		}
		start Worker rendering
	}
	red*/
	

	camFeed_node = scene_vc.canvas(camFeed_cnv);
	camFeed_node.start(0);
	camFeed_node.connect(blenderNode);

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

