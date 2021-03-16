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
	const signalServer = require('simple-signal-server')(io);

	io.engine.generateId = req =>{
		const parsedUrl = new url.parse(req.url);
		const lastId = (new url.URLSearchParams(parsedUrl.search)).get('lastId')
		if (lastId) return lastId;
		return base64id.generateId();
	}

	io.on('connection', socket => {
		console.log(socket);
		socket.on('check room',(name,purpose)=>{		
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
		});		

//purple		
/*dbg*/	socket.on('get socket id',()=>console.log(socket.id));

		socket.on('disconnect',reason=>{
			console.log(socket.id,'socket disconnected',reason);	
			if (['client namespace disconnect','transport close'].includes(reason)){
				console.log('socket disconnected');
				removeFromRoom(socket);
				return;
			}
		});

		// i need to see how to update socket id on reconnect  

		// click Leave Room >> client namespace disconnect
		// refresh >> transport close
		// comcast throttle >> disconnected ping timeout

		socket.on('getNextPartner',()=>{
			const nextPartnerId = getNextUser(socket.id);
			socket.emit('nextPartner',nextPartnerId);
		});

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
	});

	// or fuck this^

	// on client > on socket connection, store socket id in var last_id
	// on re-connection > check if last_id != null 
	// if (last_id != null) > socket fire event('reconnected', {last_id})

	// on server > on peer disconnect > setTimeout + listen for reconnected ev.
	// if time out > consider socket closed, bump from room arr
	// if onReconnected fired check if event.id == socket.id 
	// if (event.id == socket.id ) > stop timeout, reassign in room 
		// ^ old socket.id = id of socket that fired matching onReconnected.


	//OR! ^ similar, but > check if connecting socket is reconnecing, if so assign it its old id
		//https://stackoverflow.com/questions/18294620/reuse-socket-id-on-reconnect-socket-io-node-js
	//PLUS listen for disconnects on socket (not signalServ), check for reason in callback
		// ^ socket.on('disconnect',reason=>if(reason=manually closed, lost connection) remove from room);
		//https://socket.io/docs/v3/server-api/index.html#Event-%E2%80%98disconnect%E2%80%99

	// OR! it's actually simpler and i should set socket, io server and peer connection timeouts to the same 
	// signalClient timeout = 33333, io server > pingTimeout && upgradeTimeout, socket > reconnectionDelay

	signalServer.on('closed',socket=>{
		console.log('CLOSED EVE HANDLED');
	})	

	function removeFromRoom(socket){
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
		return room[partner_i];
	}
} // returns NextUserId

global.debugging = {
	getRooms:()=>console.log("rooms", rooms),
	getSocketToRoom:()=>console.log("socket to room", socketToRoom)
};