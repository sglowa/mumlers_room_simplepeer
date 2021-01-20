/*jshint esversion:6*/
const helpers = require('./helpers');

let timeout;
const printErr = (errArr)=>{
	const t = errArr.length * 4; 
	const errDiv = document.querySelector('#form-wrapper > .errors');
	if(timeout !== 'undefined')clearTimeout(timeout);
	errDiv.innerHTML = '';
	errArr.forEach(err=>{
		const errSpan = document.createElement('span');
		errSpan.className = 'err';
		errSpan.innerText = `${err}\n`;
		errDiv.appendChild(errSpan);
	});
	// print, set animation
	timeout = setTimeout(()=>{errDiv.innerHTML = '';},t*1000);
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
	formHtml = helpers.parseHtmlRes(formHtml);
	document.body.prepend(formHtml);
	const buttons = formHtml.querySelectorAll('button');
	let val;
	for (let elem of buttons) {
		elem.addEventListener('click',(event)=>{
			const className = event.target.classList[0];
			val = formHtml.querySelector(`textarea.room`).value;
			let errors = helpers.validateInput(val);
			errors = errors.concat(helpers.sanitizeInput(val));
			if(errors.length>0){
				//#0000ff append each err to formHTML
				// fade out and destroy 
				printErr(errors);
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
					printErr(["room doesn't exist"]);
					break;
				}
				if(res.isFull){
					printErr(["room is full"]);
					break;
				}
				printErr(["room joined"]);
				// socket.emit('join room',val);
				resolvePromise(val); //red
				formHtml.parentNode.removeChild(formHtml);
				break;
			case 'open' :
				if(res.roomExists){
					printErr(["room already exist"]);
					break;
				}
				printErr(['room created']);
				// socket.emit('join room',val);
				resolvePromise(val); //red
				formHtml.parentNode.removeChild(formHtml);
				break;
		}
	});	

	return promise;
};
	
