/*jshint esversion:6*/
const fs = require('fs');
const express = require('express');
const httpolyglot = require('httpolyglot');
const pug = require('pug');
const path = require('path');
let io = require('socket.io');
const app = express();
const privateKey = fs.readFileSync('/etc/letsencrypt/live/mumler.app/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/mumler.app/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/mumler.app/chain.pem', 'utf8');
const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};
const port = process.env.PORT || 8080;
require('./routes.js')(app);

const httpsServer = httpolyglot.createServer(credentials,app);
httpsServer.listen(port, ()=>{
	console.log('listening on port 8080 !');
});

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

io = io(httpsServer);
const signalling_b = require('./signalling_back.js')
signalling_b(io);


