/*jshint esversion:6*/
const helpers = require('./helpers');

const parseHtmlRes = (html)=>{
	const wrapper = document.createElement('div');
	wrapper.innerHTML = html;
	return wrapper.firstChild;
};

// const submitRoomName=(input,socket_id,url)=>{
// 	 let response = helpers.httpPost(url,{input,socket_id});
// 	 response = JSON.parse(response);
// 	 return response;
// };

module.exports = (socket)=>{

	let resolvePromise;
	const promise = new Promise((resolve,reject)=>{
		resolvePromise = resolve;
	});

	let formHtml = helpers.httpGet('./form');
	formHtml = parseHtmlRes(formHtml);
	document.body.prepend(formHtml);
	const buttons = formHtml.querySelectorAll('button');
	let val;
	for (let elem of buttons) {
		elem.addEventListener('click',(event)=>{
			const className = event.target.classList[0];
			val = formHtml.querySelector(`textarea.${className}`).value;
			let errors = helpers.validateInput(val);
			errors = errors.concat(helpers.sanitizeInput(val));
			if(errors.length>0){
				errors.forEach(err=>console.error(err));
				return;
			}
			socket.emit('check room',val,className);
		});
	}
	socket.on('check room result',res=>{
		if(res.errors){
			res.errors.forEach(err=>console.error(err));
			return;
		}
		let message;
		switch(res.purpose){
			case 'join' :
				if(!res.roomExists){
					message = "room doesn't exist";
					break;
				}
				if(res.isFull){
					message = "room is full";
					break;
				}
				message = "room joined";
				// socket.emit('join room',val);
				resolvePromise(val); //red
				formHtml.parentNode.removeChild(formHtml);
				break;
			case 'open' :
				if(res.roomExists){
					message = "room already exist";
					break;
				}
				message = 'room created';
				// socket.emit('join room',val);
				resolvePromise(val); //red
				formHtml.parentNode.removeChild(formHtml);
				break;
		}
		alert(message);	
	});	

	return promise;
};
	
