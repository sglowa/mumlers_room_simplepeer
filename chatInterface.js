/*jshint esversion:6*/
const helpers = require('./helpers');
let nextPartnerId;
let idleTrack;
let shareScreenEnabled = false;

let chatInterfaceHtml;
const constructInterface = (signalClient,myStream,camFeedComp_audio,peersRef,)=>{
	if(chatInterfaceHtml!=null)return;
	chatInterfaceHtml = helpers.httpGet('./chatInterface');
	chatInterfaceHtml = helpers.parseHtmlRes(chatInterfaceHtml);
	document.querySelector('.scene-wrapper').appendChild(chatInterfaceHtml);
	const roomName = document.querySelector('.roomName');
	const toggleVolume = document.querySelector('.toggleVolume');
	const toggleLog = document.querySelector('.toggleLog');
	const logContent = document.querySelector('.logContent');
	const leaveRoom = document.querySelector('.leaveRoom');
	const shareScreen = document.querySelector('.shareScreen');

	shareScreen.addEventListener('click',()=>{		
		if(!shareScreenEnabled){			
			navigator.mediaDevices.getDisplayMedia().then(r=>{
				shareScreenEnabled = !shareScreenEnabled;
				shareScreen.toggleAttribute('share');

			    let screenShareStr=r;
			    let screenShareTrk = screenShareStr.getVideoTracks()[0];
			    let camFeedTrk = myStream.getVideoTracks()[0];
			    idleTrack = camFeedTrk;

			    const peer = peersRef.array.find(p=>p.peerId==nextPartnerId).peer;
			    peer.replaceTrack(camFeedTrk,screenShareTrk,myStream);
			    myStream.addTrack(screenShareTrk);
			    myStream.removeTrack(camFeedTrk);
			}).catch(err=>{
				console.log(err);
			});	
		}else{
			let screenShareTrk = myStream.getVideoTracks()[0];
			const peer = peersRef.array.find(p=>p.peerId==nextPartnerId).peer;
			peer.replaceTrack(screenShareTrk,idleTrack,myStream);
			myStream.addTrack(idleTrack);
			myStream.removeTrack(screenShareTrk);
			screenShareTrk.stop();
			shareScreenEnabled = !shareScreenEnabled;
		}
		

		console.log('toggling screenShare');
	});

	toggleVolume.addEventListener('click',()=>{
		camFeedComp_audio.data.enabled = !(camFeedComp_audio.data.enabled);
		toggleVolume.toggleAttribute('volume');
	});

	leaveRoom.addEventListener('click',()=>{
		signalClient.destroy();
		location.reload();
	});
};

const setNextPartner = (id)=>{
	console.log(`next partner: ${id}`);
	nextPartnerId = id;
};

const rmInterfaceHtml = ()=>{
	helpers.removeOnce(chatInterfaceHtml);
};

module.exports = {
	constructInterface,
	setNextPartner,
	rmInterfaceHtml
};