$(function(){
   $('#search').on('keyup', function(e){
     if(e.keyCode === 13) {
       var parameters = { search: $(this).val() };
         $.get( '/searching',parameters, function(data) {
         $('#results').html(data);
       });
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
   aylienAnalyze(ajaxUrl);
   dandelionAnalyze(ajaxUrl);
   $('#articleTitle').text("Article: " + byline);
}

function dandelionAnalyze(ajaxUrl) {
   // using dandelion to get the 'summary'
   $.get('/sentiment?nurl=' + ajaxUrl, function (data) {
      console.log('dandelion getted:' + data);
      return data;
   })
   // consider changing to response.json() (won't hold process)
   .then(response => JSON.parse(response))
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
         });
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