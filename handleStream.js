/*jshint esversion:6*/


module.exports = (socket,peersRef,camStream)=>{

	let partnerPrev;
	let partnerNext;

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

		if(callData.nextUser !== partnerNext && partnerNext != socket.id){
			if(partnerNext){ // only if there was already a partner
				const oldPartnerNext = peersRef.array.find(p=>p.peerId == partnerNext);
				const streamOutgoingOldPartnerNext = oldParnterNext.peer.streams[0];
				oldPartnerNext.peer.removeTrack(camFeedA_track,streamOutgoingOldPartnerNext);	
			}			
			const newPartnerNext = peersRef.array.find(p=>p.peerId == callData.nextUser);
			const streamOutgoingNewPartner = newPartnerNext.peer.streams[0];
			newPartnerNext.peer.addTrack(camFeedA_track,streamOutgoingNewPartner);
		}
	/*	if(callData.prevUser !== partnerPrev){
			const oldPartnerPrev = peersRef.array.find(p=>p.peerId == partnerPrev);
			const streamOutgoingOldPartnerPrev = oldPartnerPrev.peer.streams[0];
			const camFeedPartner_track = streamOutgoingOldPartnerPrev.getVideoTracks()
				.find(t=> !(t instanceof CanvasCaptureMediaStreamTrack));
			oldPartnerPrev.peer.removeTrack(camFeedPartner_track,streamOutgoingOldPartnerPrev);	
		} // seems unnecessary since the track is also being removed on oldPrevPartner's side ? ? */
		partnerNext = callData.nextUser;
		partnerPrev = callData.prevUser;

		peer.on('track',(track,stream)=>{
				const peerNext = peersRef.array.find(p=>p.peerId==partnerNext).peer;				
				if(stream.id == peerNext._remoteStreams[0].id){ // received stream is mine, after bounce
					camFeedB_vid.srcObject = new MediaStream([track]);
					camFeedB_vid.play();
					setCamFeed_vc(camFeed_vc,camFeed_cnv,camFeedA_vid,camFeedB_vid);
				}else{
					peer.addTrack(track,streamOutgoing);
				}
		});
		peer.on('close',()=>{
			// again i only need to re-establish the next partner;
			console.log('peer closed');
		});
	});
};

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
function findPartnerNext(partnerNext_new){
	if(partnerNext_new==partnerNext)return;
	partnerNext=partnerNext_new;
}