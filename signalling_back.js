/*jshint esversion:6*/
const validateInput = require('./helpers.js').validateInput;
const sanitizeInput = require('./helpers.js').sanitizeInput;
const rooms = {}; //collection of all rooms , {roomId:[...],roomId:[...],roomId:[...]} 
const socketToRoom = {}; //collection of all sockets, {socketId:roomId,socketId:roomId}

module.exports = (io)=>{
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
			socket.emit('check room result',{roomExists,purpose});
			return;
		});

		socket.on('join room',name=>{
			if(rooms[name]){ // if room already exists
				const length = rooms[name].length;
				if(length === 4){
					socket.emit('room full');
					return;		
				} // ^^ is room full ?
				rooms[name].push(socket.id); // << add to existing room's array
			}else{
				rooms[name]=[socket.id]; // create roomId : [creator] entry in rooms collection
			}
			socketToRoom[socket.id]=name; // add to sockets collection
			const usersInThisRoom = rooms[name].filter(id => id !== socket.id);
			// socket.emit('ice config',ice_str);
			socket.emit('all users',usersInThisRoom); //send room members to joiner (without joiner);			
		});

		socket.on('sending signal',payload=>{ // emitted by joiner (createPeer fn), carries offer signal
			const roomMember_id = payload.userToSignal;
			// io.to(roomMember_id).emit('ice config',ice_str);
			io.to(roomMember_id).emit('user joined',{signal:payload.signal,callerId:payload.callerId}); // give existin member offer signal and id it comes from
		});  // ^^ called separately for each room member

		socket.on('returning signal',payload=>{ //emitted by existign member (addPeer fn), carries answer signal
			io.to(payload.callerId).emit('receiving returned signal',{signal:payload.signal,id:socket.id});
		}); // ^^ sent to joiner.

		socket.on('caller renegotiating',payload=>{
			const roomMember_id = payload.userToSignal;
			io.to(roomMember_id).emit('caller renegotiating signal',{signal:payload.signal,callerId:payload.callerId});
		});

		socket.on('receiver renegotiating',payload=>{
			const roomMember_id = payload.callerId;
			io.to(roomMember_id).emit('receiver renegotiating signal',{signal:payload.signal,id:socket.id});
		});

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
		socket.on('receiving stream',callData=>{
			callData.prevUser = getPrevUser(socket.id);
			callData.nextUser = getNextUser(socket.id);
			socket.emit('handle new stream',callData);
		});
	});
};

function getPrevUser(memberId){
	const name = socketToRoom[memberId];
	const member_i = rooms[name].indexOf(memberId);
	let partner_i = member_i - 1;
	partner_i = partner_i%rooms[name].length;
	partner_i = partner_i < 0 ? partner_i + rooms[name].length : partner_i;
	return rooms[name][partner_i]; 
} // -> PrevUserId

function getNextUser(memberId){
	const name = socketToRoom[memberId];
	const member_i = rooms[name].indexOf(memberId);
	let partner_i = member_i + 1;
	partner_i = partner_i%rooms[name].length;
	return rooms[name][partner_i];
} // -> NextUserId