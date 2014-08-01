/*
Title:      	Tumblr Live Search Script
Authors:     	Jacob DeHart: http://www.jacobd.com/post/22442355/tumblr-search-update
							Edit - James: http://blog.bandit.co.nz/post/80415548/tumblr-ajax-inline-search
							Edit - Sam:		http://samrayner.com
Updated:    	December 09
*/

Tumblr = {
	searchDB: [],
	searchStart: 0,		//post to start AJAX load from
	searchNum: 50,		//total number of results to retrieve
	searchLimit: 10, 	//total number of results to show
	
	getData: function() {
		try {
			var requester = new XMLHttpRequest(); //for modern browsers
		}
		catch(error) {
			try {
				var requester = new ActiveXObject("Microsoft.XMLHTTP");	//for IE
			}
			catch(error) {
				var requester = null; //for no ActiveX
			}
		}
		
		if(requester != null) {
			//call to the tumblr API
			requester.open("GET", "/api/read/json?num=" + Tumblr.searchNum + "&start=" + Tumblr.searchStart, true);
			
			//when we have progress
			requester.onreadystatechange = function() {
				//if AJAX GET has finished...
				if(requester.readyState == 4) {
					//...and the data fetch has been successful
					if(requester.status == 200 || requester.status == 304) {
						//execute the returned JavaScript (make vars available)
						eval(requester.responseText);
						
						//add each returned post to the searchDB array
						for(i = 0; i < tumblr_api_read.posts.length; i++) {
							Tumblr.searchDB.push(tumblr_api_read.posts[i]);
						}
						
						//if not all data has loaded, get again from new position
						if(tumblr_api_read['posts-total'] > (tumblr_api_read['posts-start'] + Tumblr.searchNum)) {
							Tumblr.searchStart = (tumblr_api_read['posts-start'] + Tumblr.searchNum);
							Tumblr.searchNum = Math.min(Tumblr.searchNum, tumblr_api_read['posts-total'] - Tumblr.searchStart);
							Tumblr.getData();
						}
					}
					
					//if data fetch failed
					else {
						//append error message to the sidebar
						var sidebar = document.getElementById("sidebar");
						var errorBox = document.createElement("p");
						errorBox.id = "error-message";
						var errorMessage = document.createTextNode("Live search temporarily unavailable (no response from Tumblr API).");
						errorBox.appendChild(errorMessage);
						
						sidebar.appendChild(errorMessage);
					}
				}
			};
			
			//fire the AJAX call
			requester.send(null);
		}
	},
	
	doSearch: function() {
		var query = this.value;		//search terms typed
		var results = "";					//html to output
		var count = 0;						//number of result being processed
		var total = 0;						//total number of results
		var titleLength = 50; 		//maximum character length of post titles
		var prevLength = 100; 		//maximum character length of content preview
		
		var padding = Math.max(0, Math.ceil((prevLength - query.length)/2));	//half of preview length not including the search terms
		
		//if search is long enough to be relatively unique
		if(query.length >= 3) {
			//for each post
			for(i = 0; i < Tumblr.searchDB.length; i++) {
				var p = Tumblr.searchDB[i]; //get current post
				
				var string = "";
				var title = "";
				
				//fill title and content preview string
				switch(p.type) {
					case 'regular':
						string += p['regular-body'];
						title = 'regular-title';
					break;
					
					case 'photo':
						string = p['photo-caption'];
						title = 'photo-caption';
					break;
					
					case 'quote':
						string = '"' + p['quote-text'] + '" - ' + p['quote-source'];
						title = 'quote-text';
					break;
					
					case 'link':
						string = p['link-text'] + ': ' + p['link-description'];
						title = 'link-text';
					break;
					
					case 'conversation':
						string = p['conversation-text'];
						title = 'conversation-title';
					break;
					
					case 'video':
						string = p['video-caption'];
						title = 'video-caption';
					break;
					
					case 'audio':
						string = p['audio-caption'];
						title = 'audio-caption';
					break;
				}
				
				//remove HTML tags from content preview
				string = string.replace(/<\/?[^>]+>/gi, "");
				//find position of search terms in string
				var queryPos = string.toLowerCase().indexOf(query.toLowerCase());
				
				//if search terms exist in string
				if(queryPos > -1) {
					//if haven't gone beyond result limit yet
					if(count < Tumblr.searchLimit) {
						//if there's a title set, remove HTML and use it
						if(p[title] != "")
							var titleStr = p[title].replace(/<\/?[^>]+>/gi, "");
						//if not, use the URL instead
						else
							var titleStr = p['url'];
						
						//cut long titles down to character limit
						if(titleStr.length > titleLength)
							titleStr = titleStr.substr(0, titleLength) + "&hellip;";
						
						//form result HTML
						results += '<li class="type-' + p.type + '"><a href="' + p.url + '">';
						results += "<h4>" + titleStr + "</h4>";
						results += '<p class="search-excerpt">';
						
						//if gap from start to query is decent, cut to just padding before query
						if(queryPos > padding)
							results += "&hellip;" + string.substr(queryPos - padding, padding).replace("<", "&lt;").replace(">", "&gt;");
						//if not, go right from start of preview
						else
							results += string.substr(0, queryPos).replace("<", "&lt;").replace(">", "&gt;");
						
						//highlight the search terms
						results += "<mark>";
						results += string.substr(queryPos, query.length).replace("<", "&lt;").replace(">", "&gt;");
						results += "</mark>";
						
						//print padding of content preview after terms
						results += string.substr(queryPos + query.length, padding).replace("<", "&lt;").replace(">", "&gt;");
						
						//finish HTML
						results += "&hellip;</p></a></li>";
						
						//move on to next returned post
						count++;
					}
					//increase total returned posts
					total++;
				}
			}
			
			//if no results found
			if(results == "") {
				results = "<p>No results.</p>";
			}
			
			//if results are found
			else {
				//show only the limit
				shown = Tumblr.searchLimit;
				
				//unless the total is less than the limit
				if(total < Tumblr.searchLimit)
					shown = total;
				
				//print how many shown of total with link to analogue search, then print results
				results = '<p>Showing <strong>' + shown + '</strong> of <strong>' + total + '</strong> results. <a href="/search/' + query + '">See all</a>.</p><ul>' + results + '</ul>';
			}
		}
		
		//insert into DOM
		document.getElementById("search-results").innerHTML = results;
	},
	
	init: function() {
		//get data from Tumblr API using AJAX
		Tumblr.getData();
	
		//append a placeholder for search results to sidebar
		var sidebar = document.getElementById("sidebar");
		var searchResults = document.createElement("section");
		searchResults.id = "search-results";
		
		sidebar.appendChild(searchResults);
	
	
		//add keyup listener to search input
		var searchInput = document.getElementById("search");
		searchInput.addEventListener("keyup", Tumblr.doSearch, false);
	}	
};

//run script on page load
window.addEventListener("load", Tumblr.init, false);