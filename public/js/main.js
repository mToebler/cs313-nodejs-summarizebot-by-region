//CONSTANTS
const FLOPPY_SAVED = '<span class="glyphicon glyphicon-floppy-saved right padRight"></span>';
const FLOPPY_REMOVE = '<span class="glyphicon glyphicon-floppy-remove right padRight"></span>';
const FLOPPY = '<span class="glyphicon glyphicon-floppy-disk right padRight"></span>';

// brought over from the cs313 GOp project. Detects if return is pressed for search.
$(function () {
   $('#userSearchText').on('keyup', function (e) {
      if (e.keyCode === 13) {
         userSearch();
      };
   });
});

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
      $('#articleTitle').html('Article: ' + byline + '<a href="' + ajaxUrl + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'removeArticle("' + ajaxUrl + '")\'>' + FLOPPY_REMOVE +'</a>');
   } else {
      $('#articleTitle').html('Article: ' + byline + '<a href="' + ajaxUrl + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'saveArticle("' + ajaxUrl + '", "'+byline+'")\'>' + FLOPPY +'</span></a>');
   }
   // adding in getRelatedEntities into this wrapper.
   getRelatedEntities(ajaxUrl);
}

function dandelionAnalyze(ajaxUrl) {
   $('#analysis').text('Dandelion: loading analysis...')
   // using dandelion to get the 'summary'
   $.get('/sentiment?nurl=' + ajaxUrl, function (data) {
      $('#detail').text('Loading story and analysis...');
      console.log('dandelion getted:' + data);
      return data;
   })
      // consider changing to response.json() (won't hold process)
      .then(response => {
         $('#detail').text('Loading story and analysis.....');
         return JSON.parse(response);
      })
      .then(data => {
         console.log(data);
         $('#analysis').text('Dandelion rating: ' + (JSON.stringify(data.sentiment.score)) +
            ' ' + (JSON.stringify(data.sentiment.type)));
         // getting ridiculous results here
         //replace(/(\\){1}(n){1}/, '');
         // getting \n and \\n in some results.
         var detailText = JSON.stringify(data.text).replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\\"/g, '&quot;');
         detailText = detailText.substr(1, detailText.length - 2);
         //$('#detail').text(detailText + " -- Original article: " + ajaxUrl);
         console.log("dandeLionAnalyze: detailText : ", detailText);
         $('#detail').html(detailText + "<br> <span class='OEMArticle'> --Original article: " + ajaxUrl + ' </span>');
      });
}

function aylienAnalyze(ajaxUrl) {
   console.log('Starting AYLIEN...');
   $('#aylienAnal').text('AYLIEN: loading analysis...')
   // trying the => function notation
   try {
      $.get('/aylien?nurl=' + ajaxUrl, (data) => {
         console.log('aylien getted: ' + data);
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
      console.log('try-catch aylien error:' + error);
   }
}

// using function as variable syntax
getRelatedEntities = (ajaxUrl) => {
   $.get('/related?nurl=' + ajaxUrl, data => {
      // remember, the data returns from /related has already been processed for entities
      // it should be in the format:
      //[[entityTitle, entityConfidenceScore],[....], ...]
      //it's been stringified, prolly need to parse it back into json
      var values = JSON.parse(data);
      // order them by rank
      if (values.length > 1) {
         console.log('getReltedEntities: before sort: ', values);
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
   qStr = qStr === undefined? $('#userSearchText').val() : qStr;
   if (qStr.length > 0) {
      // $.get('/q?q='+qStr, (data) => {
      //    console.log(data);
      // });
      ajaxRequest('/fox?q=' + qStr);
      ajaxRequest('/googlenews?q=' + qStr);
      ajaxRequest('/nyt?q=' + qStr);

      graphToken(qStr);
   }
}

function processAjaxUrl(ajaxUrl) {
   var x = ajaxUrl.indexOf('?');
   console.log(x);
   if (x > 0)
      return ajaxUrl.slice(1, x);
   else
      return ajaxUrl.slice(1);
}

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
      var layout = {
         title: 'Recent Popularity of ' + token,
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
let displayHelp = () => {
   $('#detail').html('<ul><li>1. Individual news headlines may be loaded and refreshed through the <span class="glyphicon standout glyphicon-refresh padLeft"></span> in each source box or from the control menu above.</li><li>2. All sources may be loaded or refreshed at once through the control menu above by selecting <a href="javascript:void(0)" onclick="ajaxPullAll()">&ldquo;Pull latest from ALL sources.&rdquo;</a></li><li>3. Select a headline to replace these instructions with the body of the article. A <span class="standout">sentiment analysis</span> of the text will load in the Analysis box to the right.</li><li>4. Use the <span class="glyphicon glyphicon-search padLeft"></span>Search box for results from all sources and a <span class="standout">graph</span> showing the relative popularity of that search term over the last 36 hours.</li><li>5. <span class="glyphicon glyphicon-floppy-disk padLeft"></span> saves a loaded article to the Saved Articles menu.</li><li>6. <span class="glyphicon glyphicon-globe padLeft"></span> opens a new tab or window with the original article.</li><li>. —————————————————————————————–———————————————————————————— .</li><li class="menu-font smaller-text padLeft">Clicking &ldquo;Real-Time News Tracker&rdquo; reloads the app. To view these instructions again, click the <span class="standout">8) R-TNT</span> logo or selecet &ldquo;Help&rdquo; from the control menu.</li><li>. —————————————————————————————————————————————————————————— .</li></ul>');
   $('#articleTitle').html('<h4>How to use:</h4>');
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
         $('#articleTitle').html('Article: ' + headline + '<a href="' + uri + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'alert("' + headline + ' has been saved. To remove, select it from the Saved Articles drop-down menu and click remove. This is to prevent inadvertent and repeated deletion and insertion.")\'>' + FLOPPY_SAVED +'</a>');
         // now to update the menu
         //savedArticlesUL <li id='saved-<%=r.article_id%>' onclick='loadArticle("<%= r.headline %>","<%=r.uri%>", <%=r.article_id%>)'><a href="javascript:void(0)"><%= r.headline %></a></li>
         $('#savedArticlesUL').append('<li id="saved-'+ normalizeSelector(uri)+ '" onclick=\'loadArticle("' + headline + '","' + uri + '", ' + '-1' + ')\'><a href="javascript:void(0)">' + headline + '</a></li>');
      } else {
         console.error('saveArticle Error: ', data.error);
         $('#articleTitle').html('Article: ' + headline + ': (previously saved) <a href="' + uri + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a><a href=\'javascript:void(0)\' onclick=\'alert("' + headline + ' has been saved. To remove, select it from the Saved Articles drop-down menu and click remove. This is to prevent inadvertent and repeated deletion and insertion.")\'>' + FLOPPY_SAVED +'</a>');
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
         selectorStr = '#saved-' + normalizeSelector(articleUrl);
         console.log('removeArticle: selectorStr: ' + selectorStr);
         $(selectorStr).remove();
         var htmlStr = $('#articleTitle').html();
         var index = htmlStr.indexOf("removeArticle") - 38;
         console.log('removeArticle: htmlStr is: ' + htmlStr);
         console.log('removeArticle: index is: ' + index);
         $('#articleTitle').html(htmlStr.substring(0, index));
      } else {
         alert('Article not removed' + response);
      }
   })
}

normalizeSelector = (selector) => {
   if (selector && selector.length > 0) {
      return selector.replace(/\W+/g, '');
   } else {
      return null;
   }
}