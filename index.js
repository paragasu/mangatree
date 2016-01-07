var {ToggleButton} = require('sdk/ui/button/toggle');
let {search}       = require('sdk/places/bookmarks');
var {data, version}= require('sdk/self');

var tabs     = require('sdk/tabs');
var Request  = require('sdk/request').Request;
var Panel    = require('sdk/panel').Panel;
var notify   = require('sdk/notifications');

var totalUpdate = 0;
var updatedList = [];

const mangaList  = {
	'www.mangahen.com' : /(www\.mangahen\.com)\/(\w+)\/(\d+)\/(\d+)?\/?/i,
	'www.mangareader.net' : /(www\.mangareader\.net)\/([\w+\-]+)\/(\d+)\/?(\d+)?\/?/i,
	'www.mangahere.co' : /(www\.mangahere\.co)\/manga\/(\w+)\/c(\d+)\/(\d+)?\/?/i,
	'www.mangatown.com' : /(www\.mangatown\.com)\/manga\/(\w+)\/c([\d+\.]+)\/(\d+)?\/?/,
	'mangafox.me': /(mangafox\.me)\/manga\/(\w+)\/v([\d+\.]+)\/c(\d+)?\/?/
}

const ICON = {
	'16': data.url('icon-16.png'),
	'32': data.url('icon-32.png')
}

notAvailableList = {
	'www.mangahen.com'    : /(raw|not available yet)+/i,
	'www.mangareader.net' : /not published yet/i,
	'www.mangahere.co'    : /not available yet/i,
	'www.mangatown.com'   : /not available yet/i
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


var button = ToggleButton({
	id: 'manga-link',
	label: 'Manga Tree',
	icon: ICON,
	
	onClick: function(state){
		
		updatedList = [];
		button.icon = data.url('ajax-loader.gif');

		var mangaSite = Object.keys(mangaList);
		var mangaBookmarkArr = mangaSite.map(searchBookmark);

		Promise.all(mangaBookmarkArr)
		.then(function(results){

			//console.log('results ', results);

			var total = 0;
			var itemArr = [];

			results.forEach(function(mangaName){
				total += mangaName.length;	
			})

			if(total === 0){
				button.icon = ICON;
				return showNoBookmarkFound();				
			}
		
			var itemList = [];

			//array of updated from manga site
			results.forEach(function(mangaName){
				mangaName.forEach(function(manga){
					itemList.push(manga);
				})
			})

			var itemArr = itemList.map(checkUpdate);

			Promise.all(itemArr)
			.then(function(items){
				
				//console.log('itemArr', items, itemArr, results);
	
				items.forEach(function(item){

					if(item != null){

						console.log('manga ', item);

						totalUpdate++;
						updatedList.push(item);	
					}				
				})

				showUpdates(state);	
			})
		})	
	}
});


var searchBookmark = function(site){

	//console.log('search bookmark for ' + site);

	return new Promise(function(resolve, reject){
			
		var bookmark = [];	
		var query    = search([{ query: site }], { sort: 'updated', decending: true });

		//console.log('search ' + site + ' bookmark ');

		query.on('end', function(result){
			
			if(Object.keys(result).length > 0){

				var bookmarks  = result.map(function(item){
					return explodeUrl(site, item);
				});

				bookmark = bookmarks.filter(latestManga);
			}

			//console.log('search done');

			resolve(bookmark);
		})
	})
}


var showUpdates = function(state){
	//console.log('updated', updatedList);
	var total = Object.keys(updatedList).length;

	button.badge = total;

	if(state.checked){
		panel.show({ position: button});	
	}
					
	button.icon = ICON;
}


var explodeUrl = function(site, bookmark){

	//console.log('match ', mangaList[site].toString(), book.url);
	var m = mangaList[site].exec(bookmark.url);

	if(m == null) return null;

	return {
		url     : 'http://' + m[0],
		site	: m[1],
		name    : m[2],
		chapter : m[3],
		page    : m[4] || 1,
		next    : makeNextUrl(site, bookmark.url)
	}
}	


var makeNextUrl = function(site, url){

	var re  = mangaList[site];

	return url.replace(re, function(match, site, name, chapter, page, offset, original){

		//TODO: Fix the issue when the page exist
		return match.replace(page, parseInt(page || 1) + 1); 
	});
}



var latestManga = function(el, index, arr){

	// remove null item
	if(el == null) return false;

	//console.log('latest manga', el, arr);

	for(var i=0, sz = Object.keys(arr).length; i < sz; i++){

		if(arr[i] == null) continue;
		//if(el.site.toLowerCase() != arr[i].site.toLowerCase()) continue;

		//check if manga name equal
		var currentManga = el.name.toLowerCase().replace(/(_|\-)/, ' ');
		var indexManga   = arr[i].name.toLowerCase().replace(/(_|\-)/, ' ');

		//console.log('compare', currentManga, indexManga);

		if(currentManga == indexManga){

			//there is another more recent bookmarked chapter 
			if(parseInt(el.chapter) < parseInt(arr[i].chapter)) return false;
			
			//there is another more recent page bookmarked 
			if(parseInt(el.page)    < parseInt(arr[i].page))    return false;
		}
	}

	return true;
}


var checkUpdate = function(item){

	var re = notAvailableList[item.site];

	//console.log('check update', item.next, re.toString());
	
	return new Promise(function(resolve, reject){
	
		Request({
			url: item.next,
			onComplete: function(response){
			
				if(response.text.search(re) == -1){
					console.log('New update available', item.next);
					resolve(item);

				}else{
					console.log('No new update', item.next, response.text.search(re));		
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
		iconURL: data.url('./icon-32.png'),
		text: 'No bookmark on ' + Object.keys(mangaList).join(',\n') + ' found.\n'
	});	
}
