const helpers = require('../helpers.js');
const validator = require('validator');

function showPopUp(pugPage,agree,disagree){	
	let popUp = helpers.httpGet(pugPage);
	popUp = helpers.parseHtmlRes(popUp);
	console.log(popUp);
	const popUpStyle = popUp.removeChild(popUp.querySelector('link'));
	document.head.appendChild(popUpStyle);
	// document.querySelector('.main-content').append(popUp.children[0]);
	// popUp.children[0].style.display = 'block'
	document.body.prepend(popUp.children[0]);
	const modalContent = document.querySelector('.modal-content');
	setTimeout(()=>{modalContent.classList.add('popUpShadow')},1000);
	modalContent.ontransitionend = (e)=>{
		e.stopPropagation();
		modalContent.classList.remove('hideChildDivs')
		modalContent.ontransitionend = "";
	}
	
	modalContent.querySelectorAll('button').forEach(btn=>{
		btn.onclick = (e)=>{						
			e.target.ontransitionend=(e)=>{
				e.stopPropagation();
				console.log(e.target)
				modalContent.classList.add('hideChildDivs');
				modalContent.querySelector('div').ontransitionend = (e)=>{
					modalContent.querySelector('div').ontransitionend = "";
					modalContent.classList.remove('popUpShadow');
					e.stopPropagation();
					let transitions=0;
					modalContent.ontransitionrun=(e)=>{
						if(e.target!=modalContent)return;
						transitions++;
						console.log(transitions);
					}
					modalContent.ontransitionend=(e)=>{								
						if(e.target!=modalContent)return;
						transitions--;
						console.log(e);
						if(!transitions){
							setTimeout(()=>{
								document.body.removeChild(document.querySelector('.modal'));
								if(!btn.dataset.agree){
									disagree();	
								}else{
									agree();
								}
							},1000)								
						}							
					}
				}
			}
		}
	})

}

let action, dom = [];
function showSchedule(callback){
	action = callback;
	let {scheduleHtml,rows} = JSON.parse(helpers.httpGet('/schedulePage'));
	// var temp = helpers.httpGet('/schedule');	
	scheduleHtml = helpers.parseHtmlRes(scheduleHtml);
	const styles = Array.from(scheduleHtml.querySelectorAll('link'));
	styles.forEach(s=>{
		scheduleHtml.removeChild(s);
		document.head.appendChild(s);
		dom.push(s);
	});
	const scripts = Array.from(scheduleHtml.querySelectorAll('script'));
	scripts.forEach(s=>{scheduleHtml.removeChild(s)});
	document.querySelector('.main-content').append(scheduleHtml);
	dom.push(scheduleHtml);
	scripts.forEach(s=>{document.body.appendChild(s); dom.push(s)});
	scheduleHtml.classList.add('hidden');
	styles[0].onload = ()=>{
		console.log('ready')
		scheduleHtml.classList.remove('hidden');
	}	
	buildScheduleLogic(rows);
	
	// document.querySelector('span.mediaReq').style.display = "unset";
}

function buildScheduleLogic(rows){
	const dates = mapFormsToRows(rows);
	const form = document.querySelector('div.form-wrapper');		
	const errors = [{
		msg:'choose a date',
		_status: true,
		set status(bool){
			this._status = bool;
			if(bool)console.log(this.msg);
			reCheckSubmit(form.querySelector('button.submit'),errors);
		},
		get status(){
			return this._status;
		}
	},{
		msg:'fill both name and email forms',
		_status:true,
		set status(bool){
			this._status = bool;
			if(bool)console.log(this.msg);
			reCheckSubmit(form.querySelector('button.submit'),errors);
		},
		get status(){
			return this._status;
		}
	},{
		msg:'name is too long',
		_status:false,
		set status(bool){
			this._status = bool;
			if(bool)console.log(this.msg);
			reCheckSubmit(form.querySelector('button.submit'),errors);
		},
		get status(){
			return this._status;
		}
	},{
		msg:"email doesn't look right",
		_status:true,
		set status(bool){
			this._status = bool;
			if(bool)console.log(this.msg);
			reCheckSubmit(form.querySelector('button.submit'),errors);
		},
		get status(){
			return this._status;
		}
	}];
	activateDateListener(dates,errors);
	const {name,email} = areFormsFilled(form,errors);
	checkName(name,errors);
	checkEmail(email,errors);
	form.querySelector('div.button-proxy').addEventListener('click',e=>{
		submitFormData(form.querySelector('button.submit'),email,name,dates,errors);
	})
}
function mapFormsToRows(rows){
	const listItems = document.querySelectorAll('li.date-item');

	const dates = rows.filter(r=>r.seatsLeft).map(r=>{
		// if(!r.seatsLeft) return;
		const i = rows.indexOf(r);

		return ({...r,
			_active:false,
			listItem : listItems[i],
			error:'',
			set active(bool){
				this._active = bool;
				if(bool){
					this.listItem.setAttribute('active','');
				}else if(!bool && this.listItem.hasAttribute('active')){
					this.listItem.removeAttribute('active','');
				}
			},
			get active(){
				return this._active;
			}
			})
	})
	console.log(dates);
	return dates;
}
function activateDateListener(dates,errors){
	dates.forEach(d=>{
		// if(!d) return;
		d.listItem.onclick = ()=>{			
			if(!d.active){
				const lastActive = dates.filter(d=>d.active);
				d.active = true;
				d.listItem.setAttribute('active','');
				errors[0].status = false;
				if(!lastActive.length) return;				
				lastActive[0].active = false;
				lastActive[0].listItem.removeAttribute('active');				
			}else{	
				d.active = false;
				d.listItem.removeAttribute('active');
				errors[0].status = true;
			}
		}
	})
}
function areFormsFilled(form,errors){
	const name = form.querySelector('input.name');
	const email = form.querySelector('input.email');
	name.addEventListener('input',()=>{
		if(!name.value || !email.value) return (errors[1].status = true);
		errors[1].status = false;
	})
	email.addEventListener('input',()=>{
		if(!name.value || !email.value) return (errors[1].status = true);
		errors[1].status = false;
	})
	return {name,email}
}
function checkName(name, errors){
	name.addEventListener('input',()=>{
		if(!name.value) return;
		const tooLong = !validator.isLength(validator.trim(name.value),{min:1,max:24})
		errors[2].status = tooLong;
	})	
}
function checkEmail(email, errors){
	email.addEventListener('input',()=>{
		if(!email.value) return;
		const isEmail = validator.isEmail(email.value);
		errors[3].status = !isEmail;
	})	
}
function reCheckSubmit(submitBtn,errors){
	let errTotal = 0;
	errors.forEach(err=>errTotal += (err.status ? 1 : 0));
	if(errTotal && !submitBtn.hasAttribute('disabled')){
		submitBtn.setAttribute('disabled','');
	}else if(!errTotal && submitBtn.hasAttribute('disabled')){
		submitBtn.removeAttribute('disabled');		
	}
	if(!submitBtn.classList.contains('animated'))submitBtn.classList.add('animated');
}
function submitFormData(submitBtn,email,name,dates,errors){
	try {
		const err = errors.find(err=>err.status);
		if(err) throw err.msg;
		const {day,time_CET,rowNumber} = dates.find(i=>i.active);
		const data = {email:email.value,
			name:name.value,
			day,
			time_CET,
			rowNumber
		};		
		const res = helpers.httpPost('/scheduleSubmit',data);
		if (res.includes('error')) throw res;
		if (res.includes('success')){
			clearSchedule(action);	
		};
		// console.log('data sent:', data);
		// i also need to send chosen date ... 
	}catch(err){
		handleErr(err);		
	}	
}
function handleErr(err){
	console.log(err);
	if(err.includes('server')) return;
	printErr(err);
}
function printErr(txt){
	const errBox = document.querySelector('#errBox');
	errBox.innerHTML = `<p class="errMsg">${txt}</p>`;
	Array.from(errBox.children).forEach(c=>helpers.retrigAnim(c));
}

function clearSchedule(callback){
	const container = dom.find(el=>el.constructor.name.includes('Div'))
	container.classList.add('hidden');
	container.ontransitionend=(e)=>{
		if(e.target!=container)return;
		dom.forEach(el=>el.remove());
		const info = document.querySelector('.info');
		let infoTxt = info.innerText;
		info.innerText = "Thank you, we will share more details with you soon.";
		info.style.display = "unset";
		setTimeout(()=>{
			info.style.display = "none";
			info.innerHTML = infoTxt;
			callback();	
		},4000);
	}	
	// callback();
}

module.exports = {
	showPopUp,
	showSchedule
}

// now submit action :: 1. get active date, recheck for errors, escape name and email, httpPost to server. 


// ja pierdole, okok, to jest banalne w chuj przeciez
// lista z datami, klikasz jedna, podswietla sie, 
// na dole form dla name i email 

// pacz czy : 
//	1. data jest wybrana
//  2. obydwa formy wypelnione 
// 	3. name jest sanitized, i miesci sie 
//	4. email jest sanitized i validated. 