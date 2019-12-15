//CONSTANTS
const FLOPPY_SAVED = '<span class="glyphicon glyphicon-floppy-saved right padRight"></span>';
const FLOPPY_REMOVE = '<span class="glyphicon glyphicon-floppy-remove right padRight"></span>';
const FLOPPY = '<span class="glyphicon glyphicon-floppy-disk right padRight"></span>';

// brought over from the cs313 GOp project. Detects if return is pressed for search.
$(function() {
   $('#userSearchText').on('keyup', function (e) {
      if (e.keyCode === 13) {
         userSearch();
      };
   });
});

// load trending searches every 15 minutes
var trendingIntervalHandler = $(setInterval(loadTrends(), 900000));


// ajaxRequest launches a deceiptively simple looking jquery ajax request
// based on the url based in as an argument, then changes the contents
// of the div with ~ same ID.
function ajaxRequest(ajaxUrl) {
   var divId = '#' + processAjaxUrl(ajaxUrl);
   console.log('ajaxRequest: divId = : ' + divId);
   $.get(ajaxUrl, function (data) {
      var results = JSON.parse(data).map((value, index, array) => {
         // expecting an array of arrays here. the 1st value in contained 
         // array: title; the 2nd: its url. return each like so:
         return "<li><a href='javascript:void(0)' onclick='ajaxSentimentCheck(" + JSON.stringify(value[0]).replace(/'/g, '-') + ", \"" + value[1] + "\")'>" + value[0] + "</a></li>";
      });
      console.log('returning to: ' + divId + ' this: ' + results + 'derived from: ' + data);
      $(divId).html('<ul>' + results.join('') + '</ul>');
   });
}

// ajaxSentimentCheck accepts an URL from one of the news source divs
// and displays a summary in #detail and the analysis to #analysis.
// Two sentiment checks are (to be) done dandelion (free for students) 
// and Alyen (two week trial key limited to 1000 'units'/24 hrs). 
// we don't want to do this on the client side to keep key secure.
function ajaxSentimentCheck(byline, ajaxUrl, articleId) {
   $('#detail').text('Loading story and analysis.');
   aylienAnalyze(ajaxUrl);
   dandelionAnalyze(ajaxUrl);
   // if an articleId is passed in, then display the remove floppy
   if (articleId) {
      $('#articleTitle').html('Article: ' + byline + '<a href="' + ajaxUrl + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'removeArticle("' + ajaxUrl + '")\'>' + FLOPPY_REMOVE + '</a>');
   } else {
      $('#articleTitle').html('Article: ' + byline + '<a href="' + ajaxUrl + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'saveArticle("' + ajaxUrl + '", "' + byline + '")\'>' + FLOPPY + '</span></a>');
   }
   // adding in getRelatedEntities into this wrapper.
   getRelatedEntities(ajaxUrl);
}

function dandelionAnalyze(ajaxUrl) {
   $('#analysis').text('Dandelion: loading analysis...')
   // using dandelion to get the 'summary'
   $.get('/sentiment?nurl=' + ajaxUrl, function (data) {
      $('#detail').text('Loading story and analysis...');
      return data;
   })
      // consider changing to response.json() (won't hold process)
      .then(response => {
         $('#detail').text('Loading story and analysis.....');
         return JSON.parse(response);
      })
      .then(data => {     
         $('#analysis').text('Dandelion rating: ' + (JSON.stringify(data.sentiment.score)) +
            ' ' + (JSON.stringify(data.sentiment.type)));
         // getting ridiculous results here
         var detailText = JSON.stringify(data.text).replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\\"/g, '&quot;');
         detailText = detailText.substr(1, detailText.length - 2);                  
         $('#detail').html(detailText + "<br> <span class='OEMArticle'> --Original article: " + ajaxUrl + ' </span>');
      });
}

function aylienAnalyze(ajaxUrl) {
   console.log('Starting AYLIEN...');
   $('#aylienAnal').text('AYLIEN: loading analysis...')
   // trying the => function notation
   try {
      $.get('/aylien?nurl=' + ajaxUrl, (data) => {         
         return data;
      })
         .then(response => JSON.parse(response))
         .then(data => {
            console.log(data.polarity);
            $('#aylienAnal').text('AYLIEN analysis: ' + data.polarity + ', confidence(' +
               data.polarity_confidence + ')');
            $('#credits').html('Big thanks to <a href="https://aylien.com/">AYLIEN</a> for use of sentiment analysis tools.');
         }).then(
            $('#credits').html('Querying <a href="https://aylien.com/">AYLIEN</a> for sentiment analysis.')
         );
   } catch (error) {
      console.error('try-catch aylien error:' + error);
   }
}

// using function as variable syntax
getRelatedEntities = (ajaxUrl) => {
   //let distinctValues = [];
   $.get('/related?nurl=' + ajaxUrl, data => {
      // remember, the data returns from /related has already been processed for entities
      // it should be in the format:
      //[[entityTitle, entityConfidenceScore],[....], ...]
      //it's been stringified, prolly need to parse it back into json
      var values = JSON.parse(data);
      // order them by rank
      if (values.length > 1) {      
         // spread operator. not to be confused with the rest operator
         values = [...values].sort(compare);
         console.log('getRelatedEntities: after sort: ', values);
      }
      // problem with terms being returned multiple times when referenced multiple times.
      // using ECMAScript 6's spread operator and Set class to get around this:
      var distinctValues = [... new Set(values.map((value) => value[0]))];
      var results = distinctValues.map((value, index) => {
         if (index < 6) return '<li onclick="userSearch(\'' + value + '\')"><a href="javascript:void(0)">' + value + '</a></li>';
      });
      $('#related').html('<h5>Related:</h5><ul>' + results.join('') + '</ul>');
      console.log('getRelatedEntities: distinctValues[0] is: ', distinctValues, distinctValues[0]);
      // let's fire off a graph of the top RelatedEntity if it exists
      if ((distinctValues.length > 0) ) { //&& (distinctValues[0].length > 0)) {
         graphToken(distinctValues[0]);
      }         
   });
};

compare = (a, b) => {
   //console.log('compare returning : ' + parseFloat(b[1] - a[1]));
   return b[1] - a[1];
   /*
   if (a[1] > b[1]) {
      return -1;
   } else if (a[1] < b[1]) {
      return 1;
   } else {
      return 0;
   }
   */
}

function ajaxPullAll() {
   ajaxRequest('/fox');
   ajaxRequest('/googlenews');
   ajaxRequest('/nyt');
}

function userSearch(qStr) {
   qStr = qStr === undefined ? $('#userSearchText').val() : qStr;
   if (qStr.length > 0) {
      ajaxRequest('/fox?q=' + qStr);
      ajaxRequest('/googlenews?q=' + qStr);
      ajaxRequest('/nyt?q=' + qStr);
      // plot.ly
      graphToken(qStr);
   }
}

function processAjaxUrl(ajaxUrl) {
   var x = ajaxUrl.indexOf('?');
   if (x > 0)
      return ajaxUrl.slice(1, x);
   else
      return ajaxUrl.slice(1);
}

// working with plot.ly's graphing js lib
function graphToken(token) {
   $.get('/interest?token=' + token, results => {
      console.log('graphToken results :', results);
      let values = JSON.parse(results);
      let indices = [];
      var popularities = values.map((value, index) => {
         indices[index] = value[1] * 1000;
         return value[0];
      })
      var popularity = {
         x: indices, y: popularities, type: 'scatter',
         line: { color: '#82B1D8', width: '1' }
      };
      console.log('popularity: ', JSON.stringify(popularity));
      var data = [popularity];
      // hard earned info
      var layout = {
         title: 'Recent Relative Popularity of ' + token,
         plot_bgcolor: '#444',
         paper_bgcolor: '#262626',
         height: '350',
         font: {
            family: '"Helvetica Neue",Helvetica,Arial,sans-serif',
            size: '9',
            color: '#ededed'
         },
         xaxis: {
            ticks: 'outside',
            showline: 'true',
            type: 'date',
            visible: 'true',
            calander: 'gregorian',
            tickformat: '%x T %H:%M'
         }
      };
      // wave the magic wand
      Plotly.newPlot('graph', data, layout);

   });
}

function loadTrends(trendDate) {
   var tUrl = '/trends';
   if (trendDate) {
      tUrl = tUrl + '?trendDate=' + trendDate;
   } 
   console.log('loadTrends: loading latest stats.');
   $.get(tUrl, results => {       
      let values = JSON.parse(results);
      //[[term, popularity][term, popularity]]
      // i believe values is ready to go, just needs formatting
      let trends = values.map(value => {         
         return '<div class="ticker-item" onclick="userSearch(\'' + value[0] + '\')"><a href="javascript:void(0)">' + value[0] + '</a>: <span style="color:' + (value[1].indexOf('M') > 0 ? 'RGBA(0,255,0,1)' : parseInt(value[1]) > 200 ? 'RGBA(255,0,0,0.9)' : value[1].search('200K') > -1 ? 'RGBA(255,0,0,0.7)' : value[1].search('100K') > -1 ? 'RGBA(255,128,0,0.7)' : value[1].search('50K') > -1 ? 'RGBA(255,255,0,0.7)' : 'inherit') + '">' + value[1] + '</span></div>';         
      });      
      var fillerDiv = '<div class="ticker-item">&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.&nbsp;.</div>'
      $('#trendingContent').html(trends.join('') + fillerDiv + fillerDiv);      
   })
}

// why the let here? Don't recall.
let displayHelp = () => {
   $('#detail').html('<ul><li>1. Individual news source headlines may be loaded through the <span class="glyphicon standout glyphicon-refresh padLeft"></span> in each source box below or from the <span class="boxHeader">Control Menu</span> above .</li><li>2. ALL news sources may be loaded at once through the <span class="boxHeader">Control Menu</span> above by selecting <a href="javascript:void(0)"    onclick="ajaxPullAll()">&ldquo;Pull latest from ALL sources.&rdquo;</a></li><li>3. Selecting a headline below will replace this content with an article, and a <span class="standout">sentiment analysis</span>   will load in the <span class="boxHeader">Analysis</span> box to the right.</li><li>4. Use the <span class="glyphicon standout glyphicon-search padLeft"></span><span class="boxHeader">Search</span> box to load results from ALL news sources</li><li>5. Loading articles and searching will attempt to show a <span class="standout">graph</span> of the relative popularity of that or related terms over the last 36 hours.</li><li>6. <span class="glyphicon standout glyphicon-floppy-disk padLeft"></span> saves an article to the <span class="boxHeader">Saved Articles</span> menu above. Selecting a saved article from the menu will load it here.</li><li>7. <span class="glyphicon standout glyphicon-globe padLeft"></span> opens a new tab or window with the original article.</li><li>8. <span class="boxHeader">Trending Searches</span> load headlines and popularity graph when clicked</li><li> &nbsp;</li><li>. ————————————————————————————————————————————————————— .</li><li class="menu-font center smaller-text padLeft">Clicking <span class="glyphicon standout glyphicon-home padLeft"></span>Real-Time News Tracker reloads the app. To view these instructions again,<br> click the <span class="standout">8) R-TNT</span> logo or select <span class="glyphicon standout glyphicon-info-sign padLeft"></span>Help from above.</li><li>. ————————————————————————————————————————————————————— .</li></ul>');
   $('#articleTitle').html('<h4>How to use R-TNT News Tracker: <a href="javascript:void(0)"><span class="glyphicon glyphicon-globe right"></span><span class="glyphicon glyphicon-floppy-disk right padRight"></span></a></h4>');
};

//just a wrapper for ajaxSentimentCheck. adding in functionality there. Is this a flag parameter? >< tightCoupling!
loadArticle = (headline, uri, articleId) => {
   articleId = articleId === undefined ? false : articleId;
   ajaxSentimentCheck(headline, uri, articleId);
}

//saveArticle & removeArticle
// save needs to make a request to the server with the following info:
// url, headline. 
// once saved, the floppy will turn into a check mark and the menu updated 
saveArticle = (uri, headline) => {
   $.get('/saveArticle?nurl=' + encodeURIComponent(uri) + '&headline=' + encodeURIComponent(headline), data => {
      if (data.status == 200) {
         $('#articleTitle').html('Article: ' + headline + '<a href="' + uri + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'alert("' + headline + ' has been saved. To remove, select it from the Saved Articles drop-down menu and click remove. This is to prevent inadvertent and repeated deletion and insertion.")\'>' + FLOPPY_SAVED + '</a>');
         // now to update the menu
         //savedArticlesUL <li id='saved-<%=r.article_id%>' onclick='loadArticle("<%= r.headline %>","<%=r.uri%>", <%=r.article_id%>)'><a href="javascript:void(0)"><%= r.headline %></a></li>
         $('#savedArticlesUL').append('<li id="saved-' + removeSpecialChars(uri) + '" onclick=\'loadArticle("' + headline + '","' + uri + '", ' + '-1' + ')\'><a href="javascript:void(0)">' + headline + '</a></li>');
      } else {
         console.error('saveArticle Error: ', data.error);
         $('#articleTitle').html('Article: ' + headline + ': (previously saved) <a href="' + uri + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'alert("' + headline + ' has been saved. To remove, select it from the Saved Articles drop-down menu and click remove. This is to prevent inadvertent and repeated deletion and insertion.")\'>' + FLOPPY_SAVED + '</a>');
         //alert('problem' + data.error);
      }
   });
}

//removeArticle
// makes a request to the server with the following info:
// url: the natural key of the article 
// once removed from cloud's database, the nav menu needs to either be regenerated or simply that element node <li> can simply be deleted.
removeArticle = (articleUrl) => {
   $.get('/removeArticle?nurl=' + encodeURIComponent(articleUrl), response => {
      if (response.status == 200) {
         // url encoded?
         selectorStr = '#saved-' + removeSpecialChars(articleUrl);
         
         $(selectorStr).remove();
         var htmlStr = $('#articleTitle').html();
         var index = htmlStr.indexOf("removeArticle") - 38;
         $('#articleTitle').html(htmlStr.substring(0, index));
      } else {
         alert('Article not removed' + response);
      }
   })
}

// helper function to remove anything that isn't a word character
// Note: by using this arrow syntax => this function has no prototype to 
// fall back on.
removeSpecialChars = (selector) => {
   if (selector && selector.length > 0) {
      return selector.replace(/\W+/g, '');
   } else {
      return null;
   }
}
