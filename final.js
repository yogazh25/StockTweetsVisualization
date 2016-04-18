var margin = {top: 40, right: 10, bottom: 10, left: 10},
    width = 320 - margin.left - margin.right,
    height = 320 - margin.top - margin.bottom;

/* treemap layout*/
var treemap = d3.layout.treemap()
    .size([width, height])
    .sticky(true)
    .value(function(d) { return d.size; });

var div = d3.select("body").append("div")
    .style("position", "relative")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
    .style("left", margin.left + "px")
    .style("top", margin.top + "px");
    

/*linear color scale*/
var color_scale = d3.scale.linear()
   .domain([0,4])
   .interpolate(d3.interpolateHcl)
   .range(["green","red"]);

d3.json("treemap.json", function(error, root) {
  if (error) throw error;

/*Tree node*/
  var node = div.datum(root).selectAll(".node")
      .data(treemap.nodes)
      .enter().append("div")
      .attr("class", "node")
      .call(position)
      .style("background", function(d) {return color_scale(d.size);})
      .text(function(d) { return d.children? null : d.name; });
});

/*rect position*/
function position() {
  this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
}
