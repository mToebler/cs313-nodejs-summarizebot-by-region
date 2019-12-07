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
function ajaxSentimentCheck(byline, ajaxUrl) {
   $('#detail').text('Loading story and analysis.');
   aylienAnalyze(ajaxUrl);
   dandelionAnalyze(ajaxUrl);
   $('#articleTitle').html('Article: ' + byline + '<a href="' + ajaxUrl + '" target="_blank"><span class="glyphicon glyphicon-globe right"></span></a>');
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
         var detailText = JSON.stringify(data.text);
         $('#detail').text(detailText + " -- Original article: " + ajaxUrl);
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
      //[[entityTitle, entityUri],[....], ...]
      //it's been stringified, prolly need to parse it back into json
      var values = JSON.parse(data);
      // problem with terms being returned multiple times when referenced multiple times.
      // using ECMAScript 6's Set object to get around this since only using the title & not the URI:
      var distinctValues = [... new Set(values.map((value) => value[0]))];
      var results = distinctValues.map((value, index) => {
         if (index < 5) return '<li onclick="userSearch(\'' + value + '\')"><a href="javascript:void(0)">' + value + '</a></li>';
      });
      $('#related').html('<h5>Related:</h5><ul>' + results.join('') + '</ul>');
   });
};

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
   $('#detail').html('<ul><li>1. Individual news headlines may be loaded and refreshed through the <span class="glyphicon standout glyphicon-refresh padLeft"></span> in each source box or from the control menu above.</li><li>2. All sources may be loaded or refreshed at once through the control menu above by selecting <a href="javascript:void(0)" onclick="ajaxPullAll()">&ldquo;Pull latest from ALL sources.&rdquo;</a></li><li>3. Select a headline to replace these instructions with the body of the article. A <span class="standout">sentiment analysis</span> of the text will load in the Analysis box to the right.</li><li>4. Use the Search box for token based search and to display a <span class="standout">graph</span> showing the relative popularity of that search term over the last 36 hours.</li><li>To view these instructions again, click the <span class="standout">8) R-TNT</span> logo or selecet &ldquo;Help&rdquo; from the control menu</li></ul>');
   $('#articleTitle').html('<h4>How to use:</h4>');
};
