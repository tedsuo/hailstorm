var chart;
var data = {};
var max_responses = 0;

function update_data(new_data){
  if(new_data.max_responses > max_responses) max_responses = new_data.max_responses;
  $.each(new_data.data, function(status, status_obj){
    $.each(status_obj, function(start_time, start_time_obj){
      $.each(start_time_obj, function(response_time, num_responses){
        if(!data[status]) data[status] = {};
        if(!data[status][start_time]) data[status][start_time] = {};
        data[status][start_time][response_time] = num_responses;
      });
    });
  });
}

function reduce(){
  ret_series = [];
  $.each(data, function(status, status_obj){
    $.each(status_obj, function(start_time, start_time_obj){
      $.each(start_time_obj, function(response_time, num_responses){
        req_obj = {
          color: 'rgba(223, 83, 83, ' + (.15 + (num_responses / max_responses) * .85) + ')',
          data: [[start_time*5, response_time * 100]],
          marker: {
            symbol: 'square'
          }
        };
        ret_series.push(req_obj);
      })
    });
  });
  return(ret_series);
}

chart_data = function(){
  chart = new Highcharts.Chart({
    chart: {
      renderTo: 'container', 
      defaultSeriesType: 'scatter',
      zoomType: 'xy'
    },
    title: {
      text: 'Response Time vs Time'
    },
    subtitle: {
      text: 'Hailstorm'
    },
    xAxis: {
      title: {
        enabled: true,
        text: 'Time (5 second granularity)'
      },
      startOnTick: true,
      endOnTick: true,
      showLastLabel: true,
      min: 0
    },
    symbols: [
      'circle'
    ],
    yAxis: {
      title: {
        text: 'Response Time (100ms granularity)'
      },
      min: 0
    },
    tooltip: {
      formatter: function() {
        return '' + this.x +' s, '+ this.y +' ms';
      }
    },
    legend: {
      enabled: false
    },
    plotOptions: {
      scatter: {
        marker: {
          radius: 5,
          states: {
            hover: {
              enabled: true,
              lineColor: 'rgb(101,100,100)'
            }
          }
        },
        states: {
          hover: {
            marker: {
              enabled: false
            }
          }
        }
      }
    },
    series: reduce()
  });
}
