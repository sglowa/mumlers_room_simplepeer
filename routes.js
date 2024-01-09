/*jshint esversion:6*/
const path = require('path');
const express = require('express');
const pug = require('pug');
const fs = require('fs');
// const peer_rooms = require('./peer_rooms.js');

module.exports = (app) => {
	// public is enough, since everything else is bundled by browserify 
	app.set('views', path.join(__dirname,'views'));
	app.set('view engine','pug');
	app.use(express.static(path.join(__dirname,'public')));		
	app.use('/scripts',express.static(path.join(__dirname,'node_modules/videocontext/dist/')));	
	app.use('/scripts',express.static(path.join(__dirname,'node_modules/bootstrap/dist/js/')));	
	app.use('/css',express.static(path.join(__dirname,'node_modules/bootstrap/dist/css/')));
	// for JSON formatted data in POST requests
	app.use(express.json());
	// for redirecs https > https
	app.enable('trust proxy');
	app.use((req,res,next)=>{
		req.secure ? next() : res.redirect('https://' + req.headers.host + req.url);
	})

	app.get('/', (req,res)=>{
		fs.readdir(path.join(__dirname,'public/assets/logo'), (err, files)=>{
			files = files.filter(f => {
				return path.extname(f) === '.png'
			});
			const logo = files[Math.floor(Math.random()*files.length)];
			res.render('index', {logo});
		})	
	});

	//red
	app.get('/schedule', (req,res)=>{
		fs.readdir(path.join(__dirname,'public/assets/logo'), (err, files)=>{
			files = files.filter(f => {
				return path.extname(f) === '.png'
			});
			const logo = files[Math.floor(Math.random()*files.length)];
			res.render('index', {logo,extra:process.argv.slice(2)[0]});
		})	
	});

	app.get('/form',(req,res)=>{
		res.send(pug.renderFile('views/form.pug'));
	});

	app.get('/chatInterface',(req,res)=>{
		res.send(pug.renderFile('views/chat_interface.pug'));		
	});

	const {routeScheduler} = require('./schedule_src/schedule.js')
	routeScheduler(app);

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