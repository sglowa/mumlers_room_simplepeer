const removeOnce = require('./helpers').removeOnce;

const mediaReq = document.querySelector('span.mediaReq');
const mainContent = document.querySelector('.main-content');

function wrongBrowser(errType,browser,elem){
	const err = {
		browser: ` Ooops, ${browser.getBrowserName()} is not supported, pls use Firefox or Chrome instead.`,
		platform: `Ooops, looks like you're using ${browser.getPlatform().type} browser. pls use desktop version of Firefox or Chrome instead, thanks. ` 
	}
	if(elem)removeOnce(elem);
	// document.querySelector('span.mediaReq').parentElement.removeChild(document.querySelector('span.mediaReq'));
	const errMsg = document.createElement('span'); 
	errMsg.className = 'err';
	errMsg.innerHTML = `<span>${err[errType]}</span>`;	
	mainContent.appendChild(errMsg);
	return;
}

function mediaNavFail(){
	removeOnce(mediaReq);
	// #0000ff serve error page.
	const errMsg = document.createElement('span'); 
	errMsg.className = 'err';
	errMsg.innerHTML = '<span>Error</span><br><span>This site requires a webcam and a microphone.<br>Please, refresh the website and enable webcam and mic.</span>';
	const mainContent = document.querySelector('.main-content');
	mainContent.appendChild(errMsg);
	return;
}

function waitingMsg(){
	const msg = document.createElement('span');
	document.querySelector('.main-content').appendChild(msg);
	msg.className = 'info waiting';
	msg.innerText = `You're Alone.`;
	let count = 0;
	const interval = setInterval(()=>{
		if(count==2){
			count=0;
			msg.innerText = `You're Alone.`;
			return;
		}
		msg.innerText+='.';
		count++;
	},500);
	return msg;
}

function joiningMsg(name){
	const msg = document.createElement('span');
	document.querySelector('.main-content').appendChild(msg);
	msg.className = 'info joining';
	msg.innerText = `Joining ${name}.`;
	let count = 0;
	const interval = setInterval(()=>{
		if(count==2){
			count=0;
			msg.innerText = `Joining ${name}.`;
			return;
		}
		msg.innerText+='.';
		count++;
	},500);
	return msg;
}

module.exports = {
	wrongBrowser,
	mediaNavFail,
	waitingMsg,
	joiningMsg
}