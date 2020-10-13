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
				if(res.roomExists){							
					socket.emit('join room',val);
					message = 'room joined';
					formHtml.parentNode.removeChild(formHtml);
				}else{message = "room doesn't exist";}
				alert(message);
				break;
			case 'open' :
				if(!res.roomExists){							
					socket.emit('join room',val);
					message = 'room created';
					formHtml.parentNode.removeChild(formHtml);
				}else{message = "room already exist";}
				alert(message);
				break;
		}	
	});	
};
	
