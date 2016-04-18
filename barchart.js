var data = [];
    
    var svgWidth = 640,
        svgHeight = 320,
        margin = {top: 60, right: 20, bottom: 30, left: 20},
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;
    
    var x = d3.scale.linear()
        .range([0, width]);
  
    var y = d3.scale.ordinal()
        .rangeRoundBands([height, 0], .1);
    
    var a = d3.rgb(255,0,0);	
    var b = d3.rgb(0,255,0);
 
    var compute = d3.interpolate(a,b);
    var cScale = d3.scale.linear()
        .range([0, 1]);
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(10);
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    var svg = d3.select("#barchart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    
    
    d3.json("dataset.json", function(error, result) {
        if (error) throw error;
        data = result;
        data.sort(function(a, b){return d3.ascending(a.frequency, b.frequency)});
        x.domain([0, d3.max(data, function(d) { return d.frequency; })]);
        y.domain(data.map(function(d) { return d.symbol; }));
        cScale.domain([0,d3.max(data, function(d) { return d.frequency; })]);
        var dev = d3.max(data, function(d){return d.frequency;}) / 5;
        
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("x", 820)
        .attr("dx", ".70em")
        .style("text-anchor", "end")
        .text("Frequency");
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .on("click", function(){
            createWindow();
        })
        .attr("class", "bar")
        .attr("y", function(d) { return y(d.symbol); })
        .attr("height", y.rangeBand())
        .attr("x", 0)
        .attr("width", function(d) { return x(d.frequency); })
        .attr("fill", function(d){
        return compute(cScale(Math.floor(d.frequency / dev) * dev));
    });
        
    var defs = svg.append("defs");
        
    var linearGradient = defs.append("linearGradient")
						.attr("id","linearColor")
						.attr("x1","0%")
						.attr("y1","100%")
						.attr("x2","0%")
						.attr("y2","0%");
 
    var stop1 = linearGradient.append("stop")
				.attr("offset","0%")
				.style("stop-color",a.toString());
 
    var stop2 = linearGradient.append("stop")
				.attr("offset","100%")
				.style("stop-color",b.toString());
        
    var colorRect = svg.append("rect")
				.attr("x", 730)
				.attr("y", 50)
				.attr("width", 30)
				.attr("height", 100)
				.style("fill","url(#" + linearGradient.attr("id") + ")");
    var text_1 = svg.append("text")
		.attr("x",700)
		.attr("y",45)
        .attr("fill", "black")
		.attr("font-size", "15px")
		.attr("font-family","simsun")
		.text("Total like");
        
    var text_2 = svg.append("text")
		.attr("x",700)
		.attr("y",65)
        .attr("fill", "black")
		.attr("font-size", "20px")
		.attr("font-family","simsun")
		.text("max");
        
    var text_3 = svg.append("text")
		.attr("x",700)
		.attr("y",150)
        .attr("fill", "black")
		.attr("font-size", "20px")
		.attr("font-family","simsun")
		.text("0");
    });
    
    function createWindow(){
        var newWindow = window.open('final.html');
            newWindowRoot = d3.select(newWindow.document.body)
            .attr("width","1060px")
            .attr("margin","50px auto")
    }