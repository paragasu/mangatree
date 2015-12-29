function createList(item){

	var title = item.name.replace(/(_|\-)+/g, ' ') + ' ' + item.chapter;

	var li    = document.createElement('li');	
	var title = document.createTextNode(title);
	var img   = document.createElement('img');
		img.setAttribute('src', 'icon-16.png');

	li.appendChild(img);	
	li.appendChild(title);
	li.addEventListener('click', function(){

		self.port.emit('clicked', item.url);
	});

	document.getElementById("main").appendChild(li);	
}


self.port.on('show', function(message){

	var data = JSON.parse(message);

	console.log('received', data);

	//reset
	var node = document.getElementById("main");	
		
	while(node.firstChild){
		node.removeChild(node.firstChild);
	}
	
	data.map(function(item){
		createList(item);
	});	
});
