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
   var divId = '#' + ajaxUrl.slice(1);
   $.get(ajaxUrl, '', function (data) {
      var results = JSON.parse(data).map((value, index, array) => {
         // expecting an array of arrays here. the 1st value in contained 
         // array: title; the 2nd: its url. return each like so:
         //<li><a href='2nd'>1st</a></li>
         //return '<li><a href="' + value[1] + '">' + value[0] + '</a></li>';
         return "<li><a href='#' onclick='ajaxSentimentCheck(" + JSON.stringify(value[0]).replace(/'/g, '-') + ", \"" + value[1] + "\")'>" + value[0] + "</a></li>";
         //return '<li><a href="#" onclick="ajaxSentimentCheck(\''+ value[0]+ '\', \'' + value[1] + '\')">' + value[0] + '</a></li>';
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
   // using dandelion to get the 'summary'
   // $.get('/sentiment?nurl=' + ajaxUrl, function (data) {
   //    console.log('dandelion getted:' + data);
   //    return data;
   // })
   //    //fetch(urlString) 
   //    // consider changing to response.json() (won't hold process)
   // .then(response => JSON.parse(response))
   // .then(data => {
   //    console.log(data);
   //    $('#analysis').text('Dandelion rating: ' + (JSON.stringify(data.sentiment.score)) +
   //       ' ' + (JSON.stringify(data.sentiment.type)));
   //    // getting ridiculous results here
   //    //replace(/(\\){1}(n){1}/, '');
   //    var detailText = JSON.stringify(data.text);
   //    $('#detail').text(detailText);
   // });
   aylienAnalyze(ajaxUrl);
   dandelionAnalyze(ajaxUrl);
   $('#articleTitle').text("Article: " + byline);
   // do the same thing, but from alyen
   // console.log('Starting Aylien...');
   // // trying the => function notation
   // try {
   //    $.get('/aylien?nurl=' + ajaxUrl, (data) => {
   //       console.log('aylien getted: ' + data);
   //       return data;
   //    })
   //       .then(response => JSON.parse(response))
   //       .then(data => {
   //          console.log(data.polarity);
   //          $('#aylienAnal').text('Aylien analysis: ' + data.polarity + ', confidence(' +
   //             data.polarity_confidence + ')');
   //       });
   // } catch (error) {
   //    console.log('try-catch aylien error:' + error);
   // }
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
      $('#detail').text(detailText);
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