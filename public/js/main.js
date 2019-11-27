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
         return '<li><a href="' + value[1] + '">' + value[0] + '</a></li>';
      });
      
      console.log('returning to: ' + divId + ' this: ' + results + 'derived from: ' + data);
      $(divId).html('<ul>' + results.join('') + '</ul>');
   });
}