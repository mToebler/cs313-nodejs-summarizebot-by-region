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
         return "<li><a href='#' onclick='ajaxSentimentCheck(" + JSON.stringify(value[0]).replace(/'/g, '-') + ", \"" + value[1] + "\")'>" + value[0] + "</a></li>";
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
   $('#articleTitle').text("Article: " + byline);
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
   console.log('Starting Aylien...');
   $('#aylienAnal').text('Aylien: loading analysis...')
   // trying the => function notation
   try {
      $.get('/aylien?nurl=' + ajaxUrl, (data) => {
         console.log('aylien getted: ' + data);
         return data;
      })
         .then(response => JSON.parse(response))
         .then(data => {
            console.log(data.polarity);
            $('#aylienAnal').text('Aylien analysis: ' + data.polarity + ', confidence(' +
               data.polarity_confidence + ')');
            $('#credits').html('Big thanks to <a href="https://aylien.com/">AYLIEN</a> for use of sentiment analysis tools.');
         }).then(
            $('#credits').html('Querying <a href="https://aylien.com/">AYLIEN</a> for sentiment analysis.')
         );
   } catch (error) {
      console.log('try-catch aylien error:' + error);
   }
}

function ajaxPullAll() {
   ajaxRequest('/fox');
   ajaxRequest('/googlenews');
   ajaxRequest('/nyt');
}

function userSearch() {
   var qStr = $('#userSearchText').val();
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
   // var trace1 = {
   //    x: [1, 2, 3, 4],
   //    y: [10, 15, 13, 17],
   //    type: 'scatter',
   //  };

   //  var trace2 = {
   //    x: [1, 2, 3, 4],
   //    y: [16, 5, 11, 9],
   //    type: 'scatter'
   //  };

   // var data = [trace1, trace2];

   // var layout = {
   //    title: 'Popularity of ' + token
   //  };

   // Plotly.newPlot('graph', data, layout);
