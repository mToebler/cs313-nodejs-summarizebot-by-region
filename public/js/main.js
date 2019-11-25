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
  

function ajaxRequest(ajaxUrl) {
   var divId = '#' + ajaxUrl.slice(1);
   $.get(ajaxUrl, '', function (data) {
      console.log('returning to: ' + divId + ' this: ' + data);
      $(divId).text(data);
   });
}