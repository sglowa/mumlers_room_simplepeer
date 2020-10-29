let interval;
self.addEventListener('message',e=>{
	switch (e.data) {
		case 'start':
			interval = setInterval(()=>{
				self.postMessage('frame');
			},66);
			break;
		case 'stop':
			if(interval)clearInterval(interval);
			break;
	}
});