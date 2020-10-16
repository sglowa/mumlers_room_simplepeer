/*jshint esversion:6*/

const camFeedB_vid = document.createElement('video');	
const camFeed_cnv = document.createElement('canvas');
const camFeed_vc = new VideoContext(camFeed_cnv);
const camFeedComp_stream = camFeed_cnv.captureStream();
// const camFeedComp_track = camFeedComp_stream.getVideoTracks()[0];
const scene_cnv = document.querySelector('canvas.scene');
const scene_vc = new VideoContext(scene_cnv);
let nextPartnerId;

module.exports = (signalClient,peer,peersRef,myStream)=>{
	console.log('handle stream called');
	const camFeedA_stream = myStream;
// 	const camFeedA_track = camFeedA_stream.getVideoTracks()[0];
	const camFeedA_vid = document.createElement('video');
	camFeedA_vid.srcObject = camFeedA_stream;	
	camFeedA_vid.play();
	
	peer.addStream(camFeedComp_stream);
	peer.once('stream',stream=>{
		console.log('receiving Comp Stream',stream); //<do something with compStream;
	// 	▼▼ ghost stream ▼▼ 
		peer.on('stream',async stream=>{
			if(stream.id == camFeedA_stream.id){
				// await getConnectionState();
				camFeedB_vid.srcObject = stream;
				camFeedB_vid.play();			
				setCamFeed_vc(camFeed_vc,camFeed_cnv,camFeedA_vid,camFeedB_vid);
			}else{
				peer.addStream(stream);
			}
		});
		signalClient.socket.emit('getNextPartner');
	});

	signalClient.socket.on('nextPartner',nextPartnerId=>{
		newNextPartner(nextPartnerId);
	});

	var getConnectionState = ()=>{
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
	};

	function newNextPartner(newNextPartnerId){
		if(newNextPartnerId !== nextPartnerId && newNextPartnerId != signalClient.id){
			if(nextPartnerId){ // only if there was already a partner
				const oldNextPartner = peersRef.array.find(p=>p.peerId == nextPartnerId);
				if(oldNextPartner) oldNextPartner.peer.removeStream(camFeedA_stream); // < making sure oldPartner hasnt disconnected
			}			
			const newNextPartner = peersRef.array.find(p=>p.peerId == newNextPartnerId);
			newNextPartner.peer.addStream(camFeedA_stream);
		}
		nextPartnerId = newNextPartnerId;
	}

	window.handleStream = {
	camFeedA_stream,
	camFeedA_vid,
	camFeedB_vid,
	camFeed_cnv,
	camFeed_vc,
	camFeedComp_stream,
	scene_cnv,
	scene_vc
	}; //for debugging;
};

/*red
module.exports = (socket,peersRef,camStream)=>{

	let partnerPrev;
	let nextPartner;

	//elements always present
	const camFeedA_stream = camStream;
	const camFeedA_track = camFeedA_stream.getVideoTracks()[0];
	const camFeedA_vid = document.createElement('video');
	camFeedA_vid.srcObject = camStream;	
	camFeedA_vid.play();
	const camFeedB_vid = document.createElement('video');	
	const camFeed_cnv = document.createElement('canvas');
	const camFeed_vc = new VideoContext(camFeed_cnv);
	const camFeedComp_stream = camFeed_cnv.captureStream();
	const camFeedComp_track = camFeedComp_stream.getVideoTracks()[0];
	const scene_cnv = document.querySelector('canvas.scene');
	const scene_vc = new VideoContext(scene_cnv);
	// const scene_stream = scene_cnv.captureStream(); // i dont need to send the scene stream

	socket.on('handle new stream',callData=>{
		const peer = peersRef.array.find(p=>p.peerId == callData.peerId).peer;
		const streamIncoming = callData.stream;
		const streamOutgoing = peer.streams[0];
		const placeholder_track = streamOutgoing.getVideoTracks()[0];
		peer.replaceTrack(placeholder_track,camFeedComp_track,streamOutgoing);

		peer.on('stream',stream=>{
			if(stream.id == camFeedA_stream.id){
				camFeedB_vid.srcObject = stream;
				camFeedB_vid.play();
				setCamFeed_vc(camFeed_vc,camFeed_cnv,camFeedA_vid,camFeedB_vid);
			}else{
				peer.addStream(stream);
			}
		});

		if(callData.nextUser !== nextPartner && nextPartner != socket.id){
			if(nextPartner){ // only if there was already a partner
				const oldNextPartner = peersRef.array.find(p=>p.peerId == nextPartner);
				oldNextPartner.peer.removeStream(camFeedA_stream);	
			}			
			const newnextPartner = peersRef.array.find(p=>p.peerId == callData.nextUser);
			newnextPartner.peer.addStream(camFeedA_stream);
		} // ^^ built for track event	
		nextPartner = callData.nextUser;
		partnerPrev = callData.prevUser;

	// //	if(callData.nextUser !== nextPartner && nextPartner != socket.id){
	// 		if(nextPartner){ // only if there was already a partner
	// 			const oldNextPartner = peersRef.array.find(p=>p.peerId == nextPartner);
	// 			const streamOutgoingOldnextPartner = oldParnterNext.peer.streams[0];
	// 			oldNextPartner.peer.removeTrack(camFeedA_track,streamOutgoingOldnextPartner);	
	// 		}			
	// 		const newnextPartner = peersRef.array.find(p=>p.peerId == callData.nextUser);
	// 		const streamOutgoingNewPartner = newnextPartner.peer.streams[0];
	// 		newnextPartner.peer.addTrack(camFeedA_track,streamOutgoingNewPartner);
	// //	} ^^ built for track event
	// //	if(callData.prevUser !== partnerPrev){
	// 		const oldPartnerPrev = peersRef.array.find(p=>p.peerId == partnerPrev);
	// 		const streamOutgoingOldPartnerPrev = oldPartnerPrev.peer.streams[0];
	// 		const camFeedPartner_track = streamOutgoingOldPartnerPrev.getVideoTracks()
	// 			.find(t=> !(t instanceof CanvasCaptureMediaStreamTrack));
	// 		oldPartnerPrev.peer.removeTrack(camFeedPartner_track,streamOutgoingOldPartnerPrev);	
	// //	} // seems unnecessary since the track is also being removed on oldPrevPartner's side ? ? << old partnerHandling (with track event);

		peer.on('close',()=>{
			// again i only need to re-establish the next partner;
			console.log('peer closed');
		});
	});
	//for debugging 
	window.handleStream = {
	camFeedA_stream,
	camFeedA_track,
	camFeedA_vid,
	camFeedB_vid,
	camFeed_cnv,
	camFeed_vc,
	camFeedComp_stream,
	camFeedComp_track,
	scene_cnv,
	scene_vc
	};
};
red*/

function setCamFeed_vc(vc,cnv,vidA,vidB){
	cnv.width = vidA.videoWidth;
	cnv.height = vidA.videoHeight;
	const vidA_node = vc.video(vidA);
	vidA_node.start(0);
	const vidB_node = vc.video(vidB);
	vidB_node.start(0);
	const invertColors_description = require('./shader_descriptions.js')
		.invertColEffectDescription;
	const invertColors_node = vc.effect(invertColors_description);
	vidB_node.connect(invertColors_node);
	const opacity_node = vc.effect(VideoContext.DEFINITIONS.OPACITY);
	opacity_node.opacity = 0.5;
	invertColors_node.connect(opacity_node);
	vidA_node.connect(vc.destination);
	opacity_node.connect(vc.destination);
	window.vc = vc;
	document.body.appendChild(cnv);
	vc.play();
}

function findPartnerPrev(partnerPrev_new){
	if(partnerPrev_new==partnerPrev)return;
	partnerPrev=partnerPrev_new;
}
function findnextPartner(nextPartner_new){
	if(nextPartner_new==nextPartner)return;
	nextPartner=nextPartner_new;
}