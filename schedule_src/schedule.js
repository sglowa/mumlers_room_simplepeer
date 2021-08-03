/*jshint esversion:6*/
const process = require('process')
const pug = require('pug');

const headers = ['day','time_CET','name1','email1','name2','email2','name3','email3','name4','email4'];
const doc = (async ()=>{

		console.log('env:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
		const {GoogleSpreadsheet} = require('google-spreadsheet');
		const doc = new GoogleSpreadsheet('1tUv8BkqtULNte1rOTBMByWuKNW6mgnq9rD0cH6gCVqI');
		await doc.useServiceAccountAuth({
			client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
			private_key:process.env.GOOGLE_PRIVATE_KEY
		})
		return doc;
})().catch(err=>{
	console.log(err);
});

function routeScheduler(app){
	app.get('/schedulePopUp',(req,res)=>{
		res.send(pug.renderFile('views/schedulePopUp.pug'));
	})

	app.get('/schedulePage',(req,res)=>{
		doc.then(async d => {
			await d.loadInfo();
			const sheet = d.sheetsByIndex[0];
			const rows = await sheet.getRows({offset:0});
			return rows
		}).then(r=>{
			const rows = parseRows(r); 			
			// res.render('schedule',{rows});	
			res.send({
				scheduleHtml:pug.renderFile('views/schedule.pug',{rows}),
				rows	
			});
			console.log('rows promise resolved');
		}).catch(err=>{
			console.log('got an error: ',err)
		})		

	})

	app.post('/scheduleSubmit',(req,res)=>{
		submitToSheet(req.body.data)
			.then(()=>{
				res.send('success');
			})
			.catch(err=>{
				console.log(err);
				res.send(`error : ${err.message}`);
			});

	})
}

function parseRows(rows){

	const rowsArr = [];
	rows.forEach(r =>{
		const obj = {rowNumber:r['_rowNumber']};
		let seatsLeft = 0;
		headers.forEach(k=>{
			if(k.includes('email') && r[k] == undefined) seatsLeft++;
			if(k.includes('email') || k.includes('name')) return;
			obj[k] = r[k];
		})
		obj.seatsLeft = seatsLeft;
		rowsArr.push(obj);
	})

	console.log(rowsArr);
	return rowsArr;
}


async function submitToSheet(data){	

	const names = headers.filter(h=>h.includes('name'));
	const emails = headers.filter(h=>h.includes('email'));
	if(names.length != emails.length) throw new Error('server: number of name inputs and email inputs do not match');
	const d = await doc;
	await d.loadInfo();
	const sheet = d.sheetsByIndex[0];
	const rows = await sheet.getRows({offset:0});
	console.log('rows loaded');

	const row = rows.find(r=>r.rowNumber == data.rowNumber);
	if(!row)throw new Error(`server: row ${data.rowNumber} doesnt exist`);
	if(row.day != data.day || row.time_CET != data.time_CET){
		throw new Error(`server: ${data.day} ${data.time_CET} is not part of row ${data.rowNumber}`);
	}
	
	let err;
	for (var i = 0; i < names.length; i++) {
		err = 'looks like last seat has just been taken 😞 \n pls select new date';
		if(row[names[i]]==undefined && row[emails[i]] == undefined){
			row[names[i]] = data.name;
			row[emails[i]] = data.email;
			row.save();
			err = '';
			console.log('success');
			break;
		}			
	}
	if(err)throw new Error(err);
}

module.exports = {
	routeScheduler
}


// SERVE SOMETHING on SUCCESS
// HANDLE SERVER ERRORS ON CLIENT SIDE

// TESTS::
// see if cells stay intact when headers arr changed 

