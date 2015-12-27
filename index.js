var {ToggleButton} = require('sdk/ui/button/toggle');
var tabs    = require('sdk/tabs');
var request = require('sdk/request').Request;
var promise = require('sdk/core/promise');

let {search, UNSORTED} = require('sdk/places/bookmarks');

const mangaList  = {
	'www.mangahen.com' : /(www\.mangahen\.com)\/(\w+)\/(\d+)\/(\d+)?\/?/i
}

const imageList = {
	'www.mangahen.com'    : /www\.mangahen\.com\/wp-content\/manga\/\d+\/\d+\/\d+\.jpg/ig,
	'www.mangareader.net' : /i\d+\.mangareader\.net\/[a-z\-]+\/\d+\/[a-z\-_0-9]+\.jpg/ig	
}

notAvailableList = {
	'www.mangahen.com'    : /not available yet/i,
	'www.mangareader.net' : /not published yet/i
}


var updatedList = [];

var button = ToggleButton({
	id: 'manga-link',
	label: 'Manga Tree',
	icon: {
		'16': './icon-16.png',
		'32': './icon-32.png',
		'64': './icon-64.png'
	},
	
	onClick: function(state){
	
		Object.keys(mangaList).map(function(manga){

			var s = search([{ query: manga }], { sort: 'updated', decending: true });

			s.on('end', function(results){

				var bookmarks  = results.map(function(res){

					var m = mangaList[manga].exec(res.url);
					var p = parseInt(m[4]) || 1;
					var nextPage = p + 1;

					if(nextPage < 10){
						nextPage = '0' + nextPage.toString();
					}

					var nextUrl = ['http:/', m[1], m[2], m[3], nextPage].join('/');

					return {
						url     : m[0],
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
				
					console.log('updated', updatedList);
					button.badge = Object.keys(updatedList).length;
	
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
	
		request({
			url: item.next,
			onComplete: function(response){
			
				if(response.text.search(re) == -1){
				
					console.log('New update available', item.next);
					resolve(item);

				}else{

					console.log('No new update');		
					resolve(null);
				}	
			}

		}).get();
	})
}

