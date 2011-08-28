$(function(){
  function reset_port() {
    switch($('#test-form #protocol').val()) {
      case 'http':
        $('#test-form #port').val('80');
        break;
      case 'https':
        $('#test-form #port').val('443');
        break;
    }
  }
  $('#test-form #protocol').change(reset_port);
  if($('#test-form #port').val() == '') {
    reset_port();
  }

  $('#test-run-form #start-test').click(){
  });
});
