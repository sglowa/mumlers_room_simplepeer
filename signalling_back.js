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

		// Socket Listeners // lightgreen
		if (!socket.listeners('check room').length){
			console.log('binding check room');
			socket.on('check room',(name,purpose)=>checkRoomHandler(name,purpose,socket));	
		}else{ console.log('check room already bound')}

		if(!socket.listeners('getNextPartner').length){
			console.log('binding getNextPartner')
			socket.on('getNextPartner',()=>nextPartnerHandler(socket));
		}else{console.log('getNextPartner already bound')}

		if(socket.listeners('disconnect').length<2){
			console.log('binding disconnect');
			socket.on('disconnect',reason=>removeFromRoom(reason,socket,io));
		}else{console.log('disconnect already bound')}

		// #88ddff readmit
		if(!socket.listeners('readmit').length){
			console.log('binding readmit');
			socket.on('readmit',name=>readmitSocket(socket,name));
		}else{console.log('readmit already bound')}

		if(!socket.listeners('is socket in room').length){
			console.log('binding is socket in room');
			socket.on('is socket in room',()=>{
				const name = socketToRoom[socket.id]
				const isIt = name ? {name ,members:rooms[name]} : false
				socket.emit('is socket in room', isIt);
			});
		}else{console.log('is socket in room already bound')}					

		//purple		
/*dbg*/	socket.on('get socket id',()=>console.log(socket.id));

	});

	// signalServer Listeners // lightgreen
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
};

// this can go to outer scope
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

function removeFromRoom(reason,socket,io){ 
	console.log(socket.id,'socket disconnected',reason);
	const roomName = socketToRoom[socket.id];
	if(rooms[roomName]){
		console.log(rooms[roomName]);
		rooms[roomName].forEach(s=>io.to(s).emit('peer left',socket.id)); // <- i can maybe tell all peers to end the connection
		rooms[roomName].delete(socket.id);
		delete socketToRoom[socket.id];
		if(rooms[roomName].size==0){
			delete rooms[roomName];
			console.log(`${roomName} closed`);
			return; // no room Closed, do not readmit... 
		}
	}

	const timeout = setTimeout(()=>{
		socket.removeAllListeners('reconnect_attempt');
		console.log(`socket ${socket.id} reconnection timeout`);
	},20000);
	socket.on('reconnect_attempt',(lastId,name)=>{
		console.log(`socket ${lastId} tries to reenter room ${name}`);
		console.log('TODO: re-admit socket to roooom');
		socket.removeAllListeners('reconnect_attempt');
		clearTimeout(timeout);
	});

	return;
}

function readmitSocket(socket,name){
	if(!name || !rooms[name]){
		console.log('readmit failed, name is invalid: ',name);
		socket.emit('room has been closed'); // <- on client: display message, with reload btn.
		return;
	};
	console.log(`readmitting socket to room ${name}`);
	if(rooms[name].has(socket.id)){
		console.log('socket already in room');
	}else{
		console.log('socket readmitted');
		rooms[name].add(socket.id);
		socketToRoom[socket.id] = name;
	}
}

function nextPartnerHandler(socket){
	const nextPartnerId = getNextUser(socket.id);
	socket.emit('nextPartner',nextPartnerId);
}

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