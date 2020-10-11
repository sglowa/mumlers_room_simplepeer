/*jshint esversion:6*/
const fs = require('fs');
const express = require('express');
const httpolyglot = require('httpolyglot');
const pug = require('pug');
const path = require('path');
let io = require('socket.io');

const app = express();

// 4 remote server
const privateKey = fs.readFileSync('/etc/letsencrypt/live/justfornow.ml/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/justfornow.ml/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/justfornow.ml/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};
// ~~~~~~~~~~~~~~~~~~

const port = process.env.PORT || 8080;

app.set('views', path.join(__dirname,'views'));
app.set('view engine','pug');
app.use(express.static(path.join(__dirname,'public')));		
app.use(express.json());
app.get('/', (req,res)=>{
	res.render('index');
});

 // 4 remote server
const httpsServer = httpolyglot.createServer(credentials,app);
httpsServer.listen(port, ()=>{
	console.log('listening on port 8080 !');
});

// ⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤
// ⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤
// ⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤
// !!! GETTING THE ICE 
// !!! WHICH ISN'T WORKING BUT SHOULD, FOR NOW IM PROVIDING THE CREDENTIALS explicitly ON CLIENT SIDE  
// let ice_str = "";
// const https = require('https');
// let o = {format:'urls'};
// let bodyString = JSON.stringify(o);
// let options = {
//       host: "global.xirsys.net",
//       path: "/_turn/mumler",
//       method: "PUT",
//       headers: {
//           "Authorization": "Basic " + Buffer.from("czajniczek:ce004e12-0bbf-11eb-80b4-0242ac150002").toString("base64"),
//           "Content-Type": "application/json",
//           "Content-Length": bodyString.length
//       }
// };
// let httpreq = https.request(options,res=>{
// 	console.log('request made');
// 	let str="";
// 	res.on('data',data=>{
// 		str+=data;
// 		console.log(str);
// 	});
// 	res.on('error',e=>console.log('erros: ',e));
// 	res.on('end',()=>{
// 		ice_str=str;
// 		console.log('response ended');

// 	});
// });
// httpreq.on('error',e=>console.log('req error: ',e));
// httpreq.end(console.log('request ended'));

// ⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤
// ⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤
// ⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤⬤

// io ~~~~~ passing peerID around (its just gonan be faster)
//collection of all rooms , {roomId:[...],roomId:[...],roomId:[...]} 
const rooms = {};
//collection of all sockets, {socketId:roomId,socketId:roomId}
const socketToRoom = {};

io = io(httpsServer);

io.on('connection', socket => {
	// console.debug('socket connected',socket);

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

		const prevUser = getPrevUser(socket.id); // gettign adjacent users.
		const nextUser = getNextUser(socket.id); // gettign adjacent users.
		const usersInThisRoom = rooms[name].filter(id => id !== socket.id);
		// socket.emit('ice config',ice_str);
		socket.emit('all users',usersInThisRoom,prevUser,nextUser); //send room members to joiner (without joiner);
	});

	socket.on('sending signal',payload=>{ // emitted by joiner (createPeer fn), carries offer signal
		const roomMember_id = payload.userToSignal;
		const prevUser = getPrevUser(roomMember_id);
		const nextUser = getNextUser(roomMember_id);
		// io.to(roomMember_id).emit('ice config',ice_str);
		io.to(roomMember_id).emit('user joined',{signal:payload.signal,callerId:payload.callerId},prevUser,nextUser); // give existin member offer signal and id it comes from
	});  // ^^ called separately for each room member

	socket.on('returning signal',payload=>{ //emitted by existign member (addPeer fn), carries answer signal
		io.to(payload.callerId).emit('receiving returned signal',{signal:payload.signal,id:socket.id});
	}); // ^^ sent to joiner.

	socket.on('disconnect',()=>{ // ?? can i also emit this when leaving room ??
		const roomId = socketToRoom[socket.id]; //get room socket belonged to
		let room = rooms[roomId]; // get user array of that room 
		if (room){
			room = room.filter(id => id !== socket.id);
			rooms[roomId] = room;
			rooms[roomId].forEach(id=>{
				const prevUser = getPrevUser(id);
				const nextUser = getNextUser(id);
				io.to(id).emit('user left',socket.id,prevUser,nextUser);
			});
		}		 
	});// ^^update the room array, send everyone updated prevUser, nextuser

});

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
