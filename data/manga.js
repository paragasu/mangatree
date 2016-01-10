var createList = function(item){

	var title = item.name.replace(/(_|\-)+/g, ' ') + ' ' + parseInt(item.chapter);

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


var sortByName = function(a, b){

	//console.log('sort', a.name, b.name);
	if(a.name.toLowerCase() < b.name.toLowerCase()) return -1 ;
	if(a.name.toLowerCase() > b.name.toLowerCase()) return  1 ;

	return 0;
}


self.port.on('show', function(message){

	var data = JSON.parse(message);

	//console.log('received', data);
	//reset
	var node = document.getElementById("main");	
		
	while(node.firstChild){
		node.removeChild(node.firstChild);
	}

	data
	.sort(sortByName)
	.map(function(item){
		createList(item);
	});	
});
