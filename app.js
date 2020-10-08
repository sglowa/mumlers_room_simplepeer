const fs = require('fs');
const express = require('express');
const httpolyglot = require('httpolyglot');
const pug = require('pug');
let io = require('socket.io');
//ech just checking instead og polyglot 
// const https = require('https');

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

require('./routes')(app);
 
 // 4 remote server
const httpsServer = httpolyglot.createServer(credentials,app);
httpsServer.listen(port, ()=>{
	console.log('listening on port 8080 !');
});

// io ~~~~~ passing peerID around (its just gonan be faster)
io = io(httpsServer);
io.on('connection', socket => {
	console.log("socket connected:");

	socket.on('userConn',(data)=>{
		console.log('incoming');
		socket.broadcast.emit('userConn',data);
	});
});

