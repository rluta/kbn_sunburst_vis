define(function (require) {
  var module = require('ui/modules').get('kibana/kbn_sunburst_vis', ['kibana']);
  var d3 = require('d3');
  var _ = require('lodash');
  var $ = require('jquery');

  var formatNumber = d3.format(',.0f');

  module.controller('KbnSunburstVisController', function ($scope, $element, $rootScope, Private) {
  var sunburstAggResponse = Private(require('./lib/agg_response'));

  var svgRoot = $element[0];
  var margin = 20;
  var width = 700;
  var height = 500;

  var radius = Math.min(width, height) / 2;

	var x = d3.scale.linear().range([0, 2 * Math.PI]);
	var y = d3.scale.linear().range([0, radius]);
	var color = d3.scale.category20c();
  var div;

  var node, root;

  div = d3.select(svgRoot);

	var partition = d3.layout.partition()
    .value(function(d) { return d.size; });

	var arc = d3.svg.arc()
		.startAngle( function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
		.endAngle(   function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
		.innerRadius(function(d) { return Math.max(0, y(d.y)); })
		.outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

  var _buildVis = function (root) {

    var svg = div.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

    var g = svg.selectAll("g")
      .data(partition.nodes(root))
      .enter().append("g");

		var path = g.append("path")
			.attr("d", arc)
			.style("fill", function(d) { return color((d.children ? d : d.parent).name); })
			.on("click", click);

    if ($scope.vis.params.showText) {
    var text = g.append("text")
        .attr("transform", function(d) { return "rotate(" + computeTextRotation(d) + ")"; })
        .attr("x", function(d) { return y(d.y); })
        .attr("dx", "6") // margin
        .attr("dy", ".35em") // vertical-align
        .text(function(d) { return ( d.name == "flare" ? "" : d.name); });
    }

    if ($scope.vis.params.showValues) {
      var textValue = g.append("text")
          .attr("transform", function(d) { return "rotate(" + computeTextRotation(d) + ")"; })
          .attr("x", function(d) { return y(d.y); })
          .attr("dx", "6") // margin
          .attr("dy", "1.35em") // vertical-align
          .attr("fill", "darkblue")
          .text(function(d) { return ( d.name == "flare" ? "" : "(" + d.size + ")"); });
    }

		function click(d) {

      if (text) text.transition().attr("opacity", 0);
      if (textValue) textValue.transition().attr("opacity", 0);

  		path.transition()
  		  .duration(250)
  		  .attrTween("d", arcTween(d))
        .each("end", function(e, i) {
          // check if the animated element's data e lies within the visible angle span given in d
          if (e.x >= d.x && e.x < (d.x + d.dx)) {
            // get a selection of the associated text element(s)
            var arcText = d3.select(this.parentNode).selectAll("text");
            // fade in the text element and recalculate positions
            if (arcText) {
              arcText.transition().duration(250)
                .attr("opacity", 1)
                .attr("transform", function() { return "rotate(" + computeTextRotation(e) + ")" })
                .attr("x", function(d) { return y(d.y); });
            }
          }
        });
  		}
    };


    var _render = function (data) {
    	d3.select(svgRoot).selectAll('svg').remove();
      	_buildVis(data.children);
    };

    $scope.$watch('esResponse', function (resp) {
      	if (resp) {
        	var chartData = sunburstAggResponse($scope.vis, resp);
        	_render(chartData);
      	}
    });

   d3.select(self.frameElement).style("height", height + "px");

  function arcTween(d) {
    var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
        yd = d3.interpolate(y.domain(), [d.y, 1]),
        yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
    return function(d, i) {
      return i
          ? function(t) { return arc(d); }
          : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
    };
  }

  function computeTextRotation(d) {
    return (x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI * 180;
  }

  });
});
