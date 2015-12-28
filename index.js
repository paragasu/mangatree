var {ToggleButton} = require('sdk/ui/button/toggle');
let {search}       = require('sdk/places/bookmarks');
var {data, version}= require('sdk/self');

var tabs     = require('sdk/tabs');
var Request  = require('sdk/request').Request;
var promise  = require('sdk/core/promise');
var Panel    = require('sdk/panel').Panel;
var notify   = require('sdk/notifications');

const mangaList  = {
	'www.mangahen.com' : /(www\.mangahen\.com)\/(\w+)\/(\d+)\/(\d+)?\/?/i
}

const ICON = {
	'16': data.url('icon-16.png'),
	'32': data.url('icon-32.png')
}

notAvailableList = {
	'www.mangahen.com'    : /(raw|not available yet)+/i,
	'www.mangareader.net' : /not published yet/i
}


var panel   = Panel({
	width: 280,
	contentURL: data.url('manga.html'),
	contentScriptFile: data.url('manga.js')
});

panel.on('show', function(){
	console.log('send port show signal');
	panel.port.emit('show', JSON.stringify(updatedList));
})

panel.port.on('clicked', function(url){
	console.log('link clicked ', url);
	tabs.open(url);
});

var updatedList = [];

var button = ToggleButton({
	id: 'manga-link',
	label: 'Manga Tree',
	icon: ICON,
	
	onClick: function(state){

		button.icon = data.url('ajax-loader.gif');

		Object.keys(mangaList).map(function(manga){

			var s = search([{ query: manga }], { sort: 'updated', decending: true });

			s.on('end', function(results){

				// no bookmark found
				if(results.length === 0){
					return showNoBookmarkFound();	
				}

				var bookmarks  = results.map(function(res){

					var m = mangaList[manga].exec(res.url);
					var p = parseInt(m[4]) || 1;
					var nextPage = p + 1;

					if(nextPage < 10){
						nextPage = '0' + nextPage.toString();
					}

					var nextUrl = ['http:/', m[1], m[2], m[3], nextPage].join('/');

					return {
						url     : 'http://' + m[0],
						site	: m[1],
						name    : m[2],
						chapter : m[3],
						page    : m[4] || '01',
						next    : nextUrl
					}
				});			

				var bookmark = bookmarks.filter(latestManga);
				var op = [];

				updatedList = [];

				bookmark.map(function(item){

					var check = checkUpdate(item).then(function(res){

						if(res != null){
							updatedList.push(res);
						}
					})	

					op.push(check);
				})

				promise.all(op).then(function(res){	
				
					//console.log('updated', updatedList);
					button.badge = Object.keys(updatedList).length;

					if(state.checked){
						panel.show({ position: button});	
					}
					
					button.icon = ICON;
				})
			})
		})	
	}
});


var latestManga = function(el, index, arr){

	for(var i=0, sz = Object.keys(arr).length; i < sz; i++){

		if(el.site != arr[i].site) return true;
		if(el.name != arr[i].name) return true;

		if(parseInt(el.chapter) < parseInt(arr[i].chapter)) return false;
		if(parseInt(el.page)    < parseInt(arr[i].page))    return false;
	}

	return true;
}


var checkUpdate = function(item){

	var re = notAvailableList[item.site];

	console.log('check update', item.next);
	
	return new Promise(function(resolve, reject){
	
		Request({
			url: item.next,
			onComplete: function(response){
			
				if(response.text.search(re) == -1){
				
					//console.log('New update available', item.next);
					resolve(item);

				}else{

					//console.log('No new update');		
					resolve(null);
				}	
			}

		}).get();
	})
}


var showNoBookmarkFound = function(){

	//restore action icon	
	button.icon = ICON;

	notify.notify({
		title: 'Manga Tree v' + version,
		iconURL: './icon-32.png',
		text: 'No bookmark on ' + Object.keys(mangaList).join(',') + ' found.\n'
	});	
}
