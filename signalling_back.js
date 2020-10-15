/*jshint esversion:6*/
const validateInput = require('./helpers.js').validateInput;
const sanitizeInput = require('./helpers.js').sanitizeInput;
const rooms = {}; //collection of all rooms , {roomId:[...],roomId:[...],roomId:[...]} 
const socketToRoom = {}; //collection of all sockets, {socketId:roomId,socketId:roomId}

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
		
		 
		 //#00ff00#00ff00
		signalServer.on('request', request=>{
			console.log('forwarding request',request);
			request.forward();
		});
		 //#00ff00#00ff00
		

		signalServer.on('disconnect',socket=>{
			console.log('peer disconnected');
			const client = socket.id;
			const roomName = socketToRoom[socket.id];
			if(rooms[roomName]){
				rooms[roomName].delete(socket.id);
				if(rooms[roomName].size==0) delete rooms[roomName];
			}
		});

		/*yellow
		socket.on('disconnect',()=>{ // ?? can i also emit this when leaving room ??
			console.debug('socket disconnected ', socket.id);
			const roomId = socketToRoom[socket.id]; //get room socket belonged to
			let room = rooms[roomId]; // get user array of that room 
			if (room){
				room = room.filter(id => id !== socket.id);
				rooms[roomId] = room;
				if(rooms[roomId].length ==0){
					delete rooms[roomId];
					return;
				}
				rooms[roomId].forEach(id=>{
					io.to(id).emit('user left',socket.id);
				});
			}
		});// ^^update the room array
		yellow*/

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
		const member_i = rooms[name].indexOf(memberId);
		let partner_i = member_i - 1;
		partner_i = partner_i%rooms[name].length;
		partner_i = partner_i < 0 ? partner_i + rooms[name].length : partner_i;
		return rooms[name][partner_i]; 	
	}
} // -> PrevUserId

function getNextUser(memberId){
	const name = socketToRoom[memberId];
	if (rooms[name]) {
		const member_i = rooms[name].indexOf(memberId);
		let partner_i = member_i + 1;
		partner_i = partner_i%rooms[name].length;
		return rooms[name][partner_i];
	}
} // -> NextUserId