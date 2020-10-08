/*jshint esversion:6*/
const helpers = require('./helpers');

const parseHtmlRes = (html)=>{
	const wrapper = document.createElement('div');
	wrapper.innerHTML = html;
	return wrapper.firstChild;
};

const submitRoomName=(input,socket_id,url)=>{
	 let response = helpers.httpPost(url,{input,socket_id});
	 response = JSON.parse(response);
	 return response;
};

module.exports = (socket)=>{
	let formHtml = helpers.httpGet('./form');
	formHtml = parseHtmlRes(formHtml);
	document.body.prepend(formHtml);
	const buttons = formHtml.querySelectorAll('button');

	for (let elem of buttons) {
		elem.addEventListener('click',(event)=>{
			const className = event.target.classList[0];
			let val = formHtml.querySelector(`textarea.${className}`).value;
			val = helpers.validateInput(val);
			if(!val) return;
			val = helpers.sanitizeInput(val);
			if(!val) return;
			let status;
			switch(className){
				case 'join' :
					status = submitRoomName(val,socket.id,'./joinRoom');
					if(!status.isAccepted||status.isTaken !== true){
						console.error(status.err||`${val} does not yet exist`);
						return;	
					}
					alert('room joined !');
					break;
				case 'open' :
					status = submitRoomName(val,socket.id,'./newRoom');
					if(!status.isAccepted||status.isTaken === true){
						console.error(status.err||`${val} is already taken`);
						return;
					}
					alert('room created !');
					break;
			}
			formHtml.parentNode.removeChild(formHtml);
			return;
		});
	}	
	
};
	
