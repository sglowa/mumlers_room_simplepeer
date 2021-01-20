/*jshint esversion:6*/
const path = require('path');
const express = require('express');
const pug = require('pug');
// const peer_rooms = require('./peer_rooms.js');

module.exports = (app) => {
	// public is enough, since everything else is bundled by browserify 
	app.set('views', path.join(__dirname,'views'));
	app.set('view engine','pug');
	app.use(express.static(path.join(__dirname,'public')));		
	app.use('/scripts',express.static(path.join(__dirname,'node_modules/videocontext/dist/')));	

	app.use(express.json());
	app.get('/', (req,res)=>{
		res.render('index');
	});

	app.get('/form',(req,res)=>{
		res.send(pug.renderFile('views/form.pug'));		
	});

	app.get('/chatInterface',(req,res)=>{
		res.send(pug.renderFile('views/chat_interface.pug'));		
	});

	// join/create room via 'POST'
	// app.post('/newRoom',(req,res)=>{		
	// 	const roomName = req.body.data.input;
	// 	const socket_id = req.body.data.socket_id;
	// 	// ▼▼ checking if name ok, if so creating room ▼▼
	// 	const result = peer_rooms.checkRoom(roomName); //checking
	// 	res.send(result);
	// 	if(result.isAccepted||result.isTaken===false) new peer_rooms.Room(roomName,socket_id); //creating		
	// 	return;
	// });

	// app.post('/joinRoom',(req,res)=>{
	// 	const roomName = req.body.data.input;
	// 	const socket_id = req.body.data.socket_id;
	// 	// ▼▼ checking if name ok and room present, if so joining ▼▼
	// 	const result = peer_rooms.checkRoom(roomName);
	// 	res.send(result);
	// 	if(result.isAccepted||result.isTaken===true) peer_rooms.joinRoom(roomName,socket_id);
	// 	return;
	// });
};