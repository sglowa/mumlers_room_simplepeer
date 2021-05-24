/*jshint esversion:6*/
const url = require('url');
const URLSearchParams = require('url')

const base64id = require('base64id');
const validateInput = require('./helpers.js').validateInput;
const sanitizeInput = require('./helpers.js').sanitizeInput;
const rooms = {}; //collection of all rooms , {roomId:[socketId], ...} 
const socketToRoom = {}; //collection of all sockets, {socketId:roomId, ...}
const roomLimit = 10;

module.exports = (io)=>{
	console.log('running signalling front')
	const signalServer = require('simple-signal-server')(io);

	io.engine.generateId = req =>{
		const parsedUrl = new url.parse(req.url);
		const lastId = (new url.URLSearchParams(parsedUrl.search)).get('lastId')
		console.log('generating id :', lastId);
		if (lastId) return lastId;
		return base64id.generateId();
	}
	// orange this should run once !!!! runs ????
	io.on('connection', socket => {
		console.log(socket);

		if (!socket.listeners('check room').length){
			console.log('binding check room');
			socket.on('check room',(name,purpose)=>checkRoomHandler(name,purpose,socket));	
		}else{ console.log('check room already bound')}

		if(socket.listeners('disconnect').length<2){
			console.log('binding disconnect');
			socket.on('disconnect',reason=>removeFromRoom(reason,socket));
		}else{console.log('disconnect already bound')}					

		if(!socket.listeners('getNextPartner').length){
			console.log('binding getNextPartner')
			socket.on('getNextPartner',()=>nextPartnerHandler(socket));
		}else{console.log('getNextPartner already bound')}

		//purple		
/*dbg*/	socket.on('get socket id',()=>console.log(socket.id));

	});

	signalServer.on('discover',request=>{
		const roomName = request.discoveryData;
		console.log(roomName);
		if(rooms[roomName]){
			rooms[roomName].add(request.socket.id);
		}else{rooms[roomName] = new Set([request.socket.id]);}
		const members = [];
		rooms[roomName].forEach(id=>{
			if(id!==request.socket.id)members.push(id);
		});
		socketToRoom[request.socket.id] = roomName;
		request.discover({roomName,members});
	});

	signalServer.on('disconnect',socket=>{
		console.log('peer disconnected');		
	});

	signalServer.on('closed',socket=>{
		console.log('CLOSED EVE HANDLED');
	})	

	function checkRoomHandler(name,purpose,socket){
		console.log(name,purpose);
		let errors = validateInput(name);
		errors = errors.concat(sanitizeInput(name));
		if(errors.length){
			socket.emit('check room result',{errors});
			return;
		}
		const roomExists = rooms[name] ? true : false;
		const isFull = roomExists ? rooms[name].length == roomLimit ? true : false : false;
		socket.emit('check room result',{roomExists,isFull,purpose});
		return;
	}

	function removeFromRoom(reason,socket){ // !!! i think this can be moved outside of the function
		console.log(socket.id,'socket disconnected',reason);	
		const client = socket.id;
		const roomName = socketToRoom[socket.id];
		if(rooms[roomName]){
			console.log(rooms[roomName]);
			rooms[roomName].forEach(s=>io.to(s).emit('peer left',client));
			rooms[roomName].delete(socket.id);
			delete socketToRoom[client];
			if(rooms[roomName].size==0){
				delete rooms[roomName];
			}
		}
		return;
	}

	function nextPartnerHandler(socket){
		const nextPartnerId = getNextUser(socket.id);
		socket.emit('nextPartner',nextPartnerId);
	}
};

function getPrevUser(memberId){
	const name = socketToRoom[memberId];
	if(rooms[name]){
		const room = Array.from(rooms[name]);
		const member_i = room.indexOf(memberId);
		let partner_i = member_i - 1;
		partner_i = partner_i%room.length;
		partner_i = partner_i < 0 ? partner_i + room.length : partner_i;
		return room[partner_i]; 	
	}
} // returns PrevUserId

function getNextUser(memberId){
	const name = socketToRoom[memberId];
	if (rooms[name]) {		
		const room = Array.from(rooms[name]);
		const member_i = room.indexOf(memberId);
		let partner_i = member_i + 1;
		partner_i = partner_i%room.length;
		console.log(`fetching new partner: ${memberId} => ${room[partner_i]}`);
		return room[partner_i];
	}else{
		console.warn("couldn't find room");
	}
} // returns NextUserId

global.debugging = {
	getRooms:()=>console.log("rooms", rooms),
	getSocketToRoom:()=>console.log("socket to room", socketToRoom)
};