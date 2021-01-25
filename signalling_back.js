/*jshint esversion:6*/
const validateInput = require('./helpers.js').validateInput;
const sanitizeInput = require('./helpers.js').sanitizeInput;
const rooms = {}; //collection of all rooms , {roomId:[socketId], ...} 
const socketToRoom = {}; //collection of all sockets, {socketId:roomId, ...}

module.exports = (io)=>{
	const signalServer = require('simple-signal-server')(io);

	io.on('connection', socket => {
		// console.debug('socket connected',socket);

		socket.on('check room',(name,purpose)=>{		
			console.log(name,purpose);
			let errors = validateInput(name);
			errors = errors.concat(sanitizeInput(name));
			if(errors.length){
				socket.emit('check room result',{errors});
				return;
			}
			const roomExists = rooms[name] ? true : false;
			const isFull = roomExists ? rooms[name].length == 6 ? true : false : false;
			socket.emit('check room result',{roomExists,isFull,purpose});
			return;
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

/*red! gets triggered on temporary disconnects, after which
peer comes back, peer connection is reestablished automatically,
peer's signalClient has the same id, but new socket with a new id*/

/*red! i should set a promise with timeout that awaits a response from 
the disconnected peer > 
• if response is given, that means that the peer was disconnected temporarily and her socket if needs to be updated
• if no response given, that means that the peer has left for sure and can be safely removed from room. 
*/
		signalServer.on('disconnect',socket=>{
			console.log('peer disconnected');
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
		});

//purple		
/*dbg*/	socket.on('get socket id',()=>console.log(socket.id));

		socket.on('disconnect',()=>console.log('socket disconnected'));

		socket.on('getNextPartner',()=>{
			const nextPartnerId = getNextUser(socket.id);
			socket.emit('nextPartner',nextPartnerId);
		});

		socket.on('receiving stream',callData=>{
			callData.prevUser = getPrevUser(socket.id);
			callData.nextUser = getNextUser(socket.id);
			socket.emit('handle new stream',callData);
		});

	});
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
		return room[partner_i];
	}
} // returns NextUserId

global.debugging = {
	getRooms:()=>console.log("rooms", rooms),
	getSocketToRoom:()=>console.log("socket to room", socketToRoom)
};