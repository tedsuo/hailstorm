$(function(){
  $('#concurrency-slider').slider({
    min: 1,
    max: 5000,
    slide: function(event, ui){
      $('#concurrency-number').html(ui.value);
    },
    change: function(event, ui){
      $('#concurrency').val(ui.value);
      $('#concurrency-number').html(ui.value);
    }
  });
  $('#concurrency-slider').slider('value', 500);
  
  $('#max-requests-slider').slider({
    min: 1,
    max: 10000,
    slide: function(event, ui){
      $('#max-requests-number').html(ui.value);
    },
    change: function(event, ui){
      $('#max_requests').val(ui.value);
      $('#max-requests-number').html(ui.value);
    }
  });
  $('#max-requests-slider').slider('value', 5000);

});
