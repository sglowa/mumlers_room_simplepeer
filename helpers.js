/*jshint esversion:6*/
const httpGet =(theUrl)=>{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request, important for data flow
    xmlHttp.setRequestHeader("Content-type", "text/html");
    /* const data = {data:'something'};
    xmlHttp.send(JSON.stringify(data)); // in case i need to send smthng with POST*/
    xmlHttp.send();
	return xmlHttp.responseText;  
};

const httpPost =(theUrl,data)=>{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "POST", theUrl, false ); // false for synchronous request, important for data flow
    xmlHttp.setRequestHeader("Content-type", 'application/json');
    const dataObject = {data:data}; //shorthand
    xmlHttp.send(JSON.stringify(dataObject)); // in case i need to send smthng with POST
	return xmlHttp.response;  
};

const validator = require('validator');
// regex to match only 1 || 0 spaces between words, no trailing spaces :
// ^\S+(\s\S+)*$
const validateInput = (input)=>{
	const errors = [];
	const isEmpty = validator.isEmpty(validator.trim(input),{ignore_whitespace:true});
	const isOutOfBounds = !validator.isLength(validator.trim(input),{min:6,max:24});
	const isTrailingSpace = validator.trim(input) != input;
	if(isEmpty)errors.push('room name is required');
	if(isOutOfBounds)errors.push('room name must be between 6 and 24 characters');
	if(isTrailingSpace)errors.push('room name cannot contain whitespace at the start or end');
	return errors;

	/* Old Validate
	const isEmpty = validator.isEmpty(validator.trim(input),{ignore_whitespace:true}) ?
		'room name is required' : false;
	const isLength = !validator.isLength(validator.trim(input),{min:6,max:24}) ?
		'room name must be between 6 and 24 characters' : false;
	const isTrailingSpace = validator.trim(input) != input ?
		'room name cannot contain whitespace at the start or end' : false;
	if(isEmpty || isLength || isTrailingSpace){
		if(isEmpty)console.error(isEmpty); //also log on screen 
		if(isLength)console.error(isLength); //also log on screen 
		if(isTrailingSpace && !isLength)console.error(isTrailingSpace); //also log on screen 
		return false;
	}else{
		return input;
	}*/
};

const sanitizeInput = (input)=>{
	console.log(validator.escape(input));
	const errors = [];
	const isDirty = input !== validator.escape(input);
	if(isDirty)errors.push("looks like you're using invalid characters");
	return errors;
};

const getUserMedia = ()=>{
	return new Promise((resolve,reject)=>{

		navigator.getUserMedia = ( navigator.getUserMedia ||
		                       navigator.webkitGetUserMedia ||
		                       navigator.mozGetUserMedia ||
		                       navigator.msGetUserMedia);

		navigator.getUserMedia({video:{
			width:{ideal:480},
			height:{ideal:360}
		},audio:false},myStream=>{
			resolve(myStream);
		},err=>{
			reject(new Error(err));
		});
	});
};

const createEmptyAudioTrack = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const dst = oscillator.connect(ctx.createMediaStreamDestination());
  oscillator.start();
  const track = dst.stream.getAudioTracks()[0];
  return Object.assign(track, { enabled: false });
};

const createEmptyVideoTrack = ({width, height}) => {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  canvas.getContext('2d').fillRect(0, 0, width, height);

  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];

  return Object.assign(track, { enabled: false});
};

const makeEmptyStream = ({ width, height })=>{
	const newAudioT = createEmptyAudioTrack();
	const newVideoT_a = createEmptyVideoTrack({width,height,});
	return new MediaStream([newAudioT,newVideoT_a]);
};

const wrapInVideo=stream=>{
	const v = document.createElement('video');
	v.srcObject = stream;
	document.body.appendChild(v);
	v.play();
}

const parseHtmlRes = (html)=>{
	const wrapper = document.createElement('div');
	wrapper.innerHTML = html;
	return wrapper.firstChild;
};

const removeOnce = (elem)=>{
	if(elem.parentElement==null)return;
	elem.parentElement.removeChild(elem);
};

const getPageVis = ()=>{
	var hidden, visibilityChange;
	if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
	  hidden = "hidden";
	  visibilityChange = "visibilitychange";
	} else if (typeof document.msHidden !== "undefined") {
	  hidden = "msHidden";
	  visibilityChange = "msvisibilitychange";
	} else if (typeof document.webkitHidden !== "undefined") {
	  hidden = "webkitHidden";
	  visibilityChange = "webkitvisibilitychange";
	}
	return{hidden,visibilityChange};
};

const saveConsoleLog = ()=>{

	var aggrLog = '';
	(function(){
	    var oldLog = console.log;
	    console.log = function (message) {
	    	var message = JSON.stringify(message);
	        aggrLog += Array.prototype.join.call(arguments, ' ') + '\n';
	        oldLog.apply(console, arguments);
	    };
	})();
	(function(){
	    var oldLog = console.error;
	    console.error = function (message) {
	    	var message = JSON.stringify(message);
	        aggrLog += Array.prototype.join.call(arguments, ' ') + '\n';
	        oldLog.apply(console, arguments);
	    };
	})();

	(function(console){

	console.save = function(data = aggrLog, filename = 'consoleLog.json'){

	    if(!data) {
	        console.error('Console.save: No data')
	        return;
	    }

	    if(!filename) filename = 'console.json'

	    if(typeof data === "object"){
	        data = JSON.stringify(data, undefined, 4)
	    }

	    var blob = new Blob([data], {type: 'text/json'}),
	        e    = document.createEvent('MouseEvents'),
	        a    = document.createElement('a')

	    a.download = filename
	    a.href = window.URL.createObjectURL(blob)
	    a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
	    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
	    a.dispatchEvent(e)
	 }
	})(console)
}

// using es6 shorthand
module.exports = {
	httpGet,
	httpPost,
	validateInput,
	sanitizeInput,
	getUserMedia,
	makeEmptyStream,
	wrapInVideo,
	parseHtmlRes,
	removeOnce,
	getPageVis,
	saveConsoleLog
};