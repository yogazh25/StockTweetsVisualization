function LineGraph(argsMap) {

	var self = this;
	
	// Appending new data points to the end of the lines and sliding them within the time window
	this.slideData = function(newData) {
		// validate data
		var tempData = processDataMap(newData);
		debug("Existing startTime: " + data.startTime + "  endTime: " + data.endTime);
		debug("New startTime: " + tempData.startTime + "  endTime: " + tempData.endTime);
		
		// validate step is the same on each
		if(tempData.step != newData.step) {
			throw new Error("The step size on appended data must be the same as the existing data => " + data.step + " != " + tempData.step);
		}

		if(tempData.values[0].length == 0) {
			throw new Error("There is no data to append.");
		}
		
		var numSteps = tempData.values[0].length;
		console.log("slide => add num new values: " + numSteps);
		console.log(tempData.values[0])
		tempData.values.forEach(function(dataArrays, i) {
			var existingDataArrayForIndex = data.values[i];
			dataArrays.forEach(function(v) {
				console.log("slide => add new value: " + v);
				// push each new value onto the existing data array
				existingDataArrayForIndex.push(v);
				// shift the front value off to compensate for what we just added
				existingDataArrayForIndex.shift();
			})
		})
		
		// shift domain by number of data elements just added
		data.startTime = new Date(data.startTime.getTime() + (data.step * numSteps));
		data.endTime = tempData.endTime;
		debug("Updated startTime: " + data.startTime + "  endTime: " + data.endTime);
				
		// redraw each line
		redrawAxes(false);	
		redrawLines(false);
			
	    // slide the lines left
	    graph.selectAll("g .lines path")
	        .attr("transform", "translate(-" + x(numSteps*data.step) + ")");
		 
		handleDataUpdate();
		
		// fire an event that data was updated
		$(container).trigger('LineGraph:dataModification')
	}
	
	
	 // Full refresh of the data:
	this.updateData = function(newData) {
		// data is being replaced, not appended so we re-assign 'data'
		data = processDataMap(newData);
		// and then we rebind data.values to the lines
	    graph.selectAll("g .lines path").data(data.values)
		
		// redraw (with transition)
		redrawAxes(true);
		redrawLines(false);
		handleDataUpdate();
		
		// fire an event that data was updated
		$(container).trigger('LineGraph:dataModification')
	}

	this.switchToLinearScale = function() {
		yScale = 'linear';
		redrawAxes(true);		
		redrawLines(true);
		
		// fire an event that config was changed
		$(container).trigger('LineGraph:configModification')
	}
	
	 // Return the current scale value
	this.getScale = function() {
		return yScale;
	}

	
	var containerId;
	var container;
	
	// functions we use to display and interact with the graphs and lines
	var graph, x, yLeft, yRight, xAxis, yAxisLeft, yAxisRight, yAxisLeftDomainStart, linesGroup, linesGroupText, lines, lineFunction, lineFunctionSeriesIndex = -1;
	var yScale = 'linear';
	var scales = [' ',' '];
	var hoverContainer, hoverLine, hoverLineXOffset, hoverLineYOffset, hoverLineGroup;
	var legendFontSize = 12; // we can resize dynamically to make fit so we remember it here

	// instance storage of data to be displayed
	var data;
		
	// define dimensions of graph
	var margin = [-1, -1, -1, -1]; // margins (top, right, bottom, left)
	var w, h;	 // width & height
	
	var transitionDuration = 300;
	
	var formatNumber = d3.format(",.0f") // for formatting integers
	var tickFormatForLogScale = function(d) { return formatNumber(d) };
	
	// used to track if the user is interacting via mouse/finger instead of trying to determine
	// by analyzing various element class names to see if they are visible or not
	var userCurrentlyInteracting = false;
	var currentUserPositionX = -1;
		
	// initialization and validation */
	var _init = function() {
		// required variables that we'll throw an error on if we don't find
		containerId = getRequiredVar(argsMap, 'containerId');
		container = document.querySelector('#' + containerId);
		
		// margins with defaults (do this before processDataMap since it can modify the margins)
		margin[0] = getOptionalVar(argsMap, 'marginTop', 20) // marginTop allows fitting the actions, date and top of axis labels
		margin[1] = getOptionalVar(argsMap, 'marginRight', 20)
		margin[2] = getOptionalVar(argsMap, 'marginBottom', 35) // marginBottom allows fitting the legend along the bottom
		margin[3] = getOptionalVar(argsMap, 'marginLeft', 90) // marginLeft allows fitting the axis labels
		
		// assign instance vars from dataMap
		data = processDataMap(getRequiredVar(argsMap, 'data'));
		yScale = data.scale;
		initDimensions();
		
		createGraph()
		//debug("Initialization successful for container: " + containerId)	
		var TO = false;
		$(window).resize(function(){
		 	if(TO !== false)
		    	clearTimeout(TO);
		 	TO = setTimeout(handleWindowResizeEvent, 200); // time in miliseconds
		});
	}
	
	 // Return a validated data map
	var processDataMap = function(dataMap) {
		// assign data values to plot over time
		var dataValues = getRequiredVar(dataMap, 'values', "The data object must contain a 'values' value with a data array.")
		var startTime = new Date(getRequiredVar(dataMap, 'start', "The data object must contain a 'start' value with the start time in milliseconds since epoch."))
		var endTime = new Date(getRequiredVar(dataMap, 'end', "The data object must contain an 'end' value with the end time in milliseconds since epoch."))
		var step = getRequiredVar(dataMap, 'step', "The data object must contain a 'step' value with the time in milliseconds between each data value.")		
		var names = getRequiredVar(dataMap, 'names', "The data object must contain a 'names' array with the same length as 'values' with a name for each data value array.")		
		var displayNames = getOptionalVar(dataMap, 'displayNames', names);
		var numAxisLabelsPowerScale = getOptionalVar(dataMap, 'numAxisLabelsPowerScale', 6); 
		var numAxisLabelsLinearScale = getOptionalVar(dataMap, 'numAxisLabelsLinearScale', 6); 
		
		var axis = getOptionalVar(dataMap, 'axis', []);
		// default axis values
		if(axis.length == 0) {
			displayNames.forEach(function (v, i) {
				// set the default to left axis
				axis[i] = "left";
			})
		} else {
			var hasRightAxis = false;
			axis.forEach(function(v) {
				if(v == 'right') {
					hasRightAxis = true;
				}
			})
			if(hasRightAxis) {
				// add space to right margin
				margin[1] = margin[1] + 50;
			}
		}

		
		var colors = getOptionalVar(dataMap, 'colors', []);
		// default colors values
		if(colors.length == 0) {
			displayNames.forEach(function (v, i) {
				colors[i] = "black";
			})
		}
		
		var maxValues = [];
		var rounding = getOptionalVar(dataMap, 'rounding', []);
		if(rounding.length == 0) {
			displayNames.forEach(function (v, i) {
				rounding[i] = 0;
			})
		}
		
		// copy the dataValues array
		var newDataValues = [];
		dataValues.forEach(function (v, i) {
			newDataValues[i] = v.slice(0);
			maxValues[i] = d3.max(newDataValues[i])
		})
	
		return {
			"values" : newDataValues,
			"startTime" : startTime,
			"endTime" : endTime,
			"step" : step,
			"names" : names,
			"displayNames": displayNames,
			"axis" : axis,
			"colors": colors,
			"scale" : getOptionalVar(dataMap, 'scale', yScale),
			"maxValues" : maxValues,
			"rounding" : rounding,
			"numAxisLabelsLinearScale": numAxisLabelsLinearScale,
			"numAxisLabelsPowerScale": numAxisLabelsPowerScale
		}
	}
	
	var redrawAxes = function(withTransition) {
		initY();
		initX();
		
		if(withTransition) {
			// slide x-axis to updated location
			graph.selectAll("g .x.axis").transition()
                .duration(transitionDuration)
                .ease("linear")
                .call(xAxis)				  
		
			// slide y-axis to updated location
			graph.selectAll("g .y.axis.left").transition()
                .duration(transitionDuration)
                .ease("linear")
                .call(yAxisLeft)
			
			
            // slide y-axis to updated location
            graph.selectAll("g .y.axis.right").transition()
				.duration(transitionDuration)
				.ease("linear")
				.call(yAxisRight)
			
		} else {
			// slide x-axis to updated location
			graph.selectAll("g .x.axis")
			     .call(xAxis)				  
		
			// slide y-axis to updated location
			graph.selectAll("g .y.axis.left")
			     .call(yAxisLeft)
			
            // slide y-axis to updated location
            graph.selectAll("g .y.axis.right")
				.call(yAxisRight)
			
		}
	}
	
	var redrawLines = function(withTransition) {
		lineFunctionSeriesIndex  =-1;
		
		// redraw lines
		if(withTransition) {
			graph.selectAll("g .lines path")
			.transition()
				.duration(transitionDuration)
				.ease("linear")
				.attr("d", lineFunction)
				.attr("transform", null);
		} else {
			graph.selectAll("g .lines path")
				.attr("d", lineFunction)
				.attr("transform", null);
		}
	}
	
	var initY = function() {
		initYleft();
		initYright();
	}
	
	var initYleft = function() {
		var maxYscaleLeft = calculateMaxY(data, 'left')
		//debug("initY => maxYscale: " + maxYscaleLeft);
		var numAxisLabels = 6;
        yLeft = d3.scale.linear().domain([0, maxYscaleLeft]).range([h, 0]).nice();
        numAxisLabels = data.numAxisLabelsLinearScale;
		yAxisLeft = d3.svg.axis().scale(yLeft).ticks(numAxisLabels, tickFormatForLogScale).orient("left");
	}
	
	var initYright = function() {
		var maxYscaleRight = calculateMaxY(data, 'right')
        //debug("initY => maxYscale: " + maxYscaleRight);
        var numAxisLabels = 6;
        yRight = d3.scale.linear().domain([0, maxYscaleRight]).range([h, 0]).nice();
        numAxisLabels = data.numAxisLabelsLinearScale;
        yAxisRight = d3.svg.axis().scale(yRight).ticks(numAxisLabels, tickFormatForLogScale).orient("right");
		
	}
	
    // re-calculate if the max Y scale has changed
	var calculateMaxY = function(data, whichAxis) {
		var maxValuesForAxis = [];
		data.maxValues.forEach(function(v, i) {
			if(data.axis[i] == whichAxis) {
				maxValuesForAxis.push(v);
			}
		})
		return d3.max(maxValuesForAxis);
	}
		var initX = function() {
		// X scale starts with 300s increments
		x = d3.time.scale().domain([data.startTime, data.endTime]).range([0, w]);
		// create yAxis (with ticks)
		xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(1);

	}

	// Creates the SVG elements and displays the line graph.Expects to be called once during instance initialization.
	var createGraph = function() {
		// Add an SVG element with the desired dimensions and margin.
		graph = d3.select("#" + containerId).append("svg:svg")
				.attr("class", "line-graph")
				.attr("width", w + margin[1] + margin[3])
				.attr("height", h + margin[0] + margin[2])	
				.append("svg:g")
					.attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");
		initX()		
		
		// Add the x-axis.
		graph.append("svg:g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + h + ")")
			.call(xAxis);
		initY();
				
		// Add the y-axis to the left & right
		graph.append("svg:g")
			.attr("class", "y axis left")
			.attr("transform", "translate(-10,0)")
			.call(yAxisLeft);
        graph.append("svg:g")
            .attr("class", "y axis right")
            .attr("transform", "translate(" + (w+10) + ",0)")
            .call(yAxisRight);
				
		// create line function used to plot our data
		lineFunction = d3.svg.line()
			// assign the X function to plot our line as we wish
			.x(function(d,i) { 
				var _x = x(data.startTime.getTime() + (data.step*i)); 
				return _x;
			})
			.y(function(d, i) { 
				if(i == 0) {
					lineFunctionSeriesIndex++;
				}
				var axis = data.axis[lineFunctionSeriesIndex];
				var _y;
				if(axis == 'right') {
					_y = yRight(d); 
				} else {
					_y = yLeft(d); 
				}
				return _y;
			})
			.defined(function(d) {
				return d >= 0;
			});

		// append a group to contain all lines
		lines = graph.append("svg:g")
				.attr("class", "lines")
			.selectAll("path")
				.data(data.values); // bind the array of arrays

		// persist this reference so we don't do the selector every mouse event
		hoverContainer = container.querySelector('g .lines');
		
		
		$(container).mouseleave(function(event) {
			handleMouseOutGraph(event);
		})
		
		$(container).mousemove(function(event) {
			handleMouseOverGraph(event);
		})		

					
		// add a line group for each array of values (it will iterate the array of arrays bound to the data function above)
		linesGroup = lines.enter().append("g")
				.attr("class", function(d, i) {
					return "line_group series_" + i;
				});
				
		// add path (the actual line) to line group
		linesGroup.append("path")
				.attr("class", function(d, i) {
					//debug("Appending line [" + containerId + "]: " + i)
					return "line series_" + i;
				})
				.attr("fill", "none")
				.attr("stroke", function(d, i) {
					return data.colors[i];
				})
				.attr("d", lineFunction) 
				.on('mouseover', function(d, i) {
					handleMouseOverLine(d, i);
				});
				
		// add line label to line group
		linesGroupText = linesGroup.append("svg:text");
		linesGroupText.attr("class", function(d, i) {
				//debug("Appending line [" + containerId + "]: " + i)
				return "line_label series_" + i;
			})
			.text(function(d, i) {
				return "";
			});
			
		// add a 'hover' line that we'll show as a user moves their mouse (or finger)
		hoverLineGroup = graph.append("svg:g")
							.attr("class", "hover-line");
		// add the line to the group
		hoverLine = hoverLineGroup
			.append("svg:line")
				.attr("x1", 10).attr("x2", 10) // vertical line so same value on each
				.attr("y1", 0).attr("y2", h); // top to bottom	
				
		// hide it by default
		hoverLine.classed("hide", true);
			
		createScaleButtons();
		createDateLabel();
		createLegend();		
		setValueLabelsToLatest();
	}

	 // Create a legend that displays the name of each line with appropriate color coding and allows for showing the current value when doing a mouseOver
	var createLegend = function() {
		
		// append a group to contain all lines
		var legendLabelGroup = graph.append("svg:g")
				.attr("class", "legend-group")
			.selectAll("g")
				.data(data.displayNames)
			.enter().append("g")
				.attr("class", "legend-labels");
				
		legendLabelGroup.append("svg:text")
				.attr("class", "legend name")
				.text(function(d, i) {
					return d;
				})
				.attr("font-size", legendFontSize)
				.attr("fill", function(d, i) {
					// return the color for this row
					return data.colors[i];
				})
				.attr("y", function(d, i) {
					return h+28;
				})

				
		// put in placeholders with 0 width to resize dynamically
		legendLabelGroup.append("svg:text")
				.attr("class", "legend value")
				.attr("font-size", legendFontSize)
				.attr("fill", function(d, i) {
					return data.colors[i];
				})
				.attr("y", function(d, i) {
					return h+28;
				})
	}
	
	var redrawLegendPosition = function(animate) {
		var legendText = graph.selectAll('g.legend-group text');
		if(animate) {
			legendText.transition()
			.duration(transitionDuration)
			.ease("linear")
			.attr("y", function(d, i) {
				return h+28;
			});	
			
		} else {
			legendText.attr("y", function(d, i) {
				return h+28;
			});	
		}	
	}
	
	 // Create scale buttons for switching the y-axis
	var createScaleButtons = function() {
		var cumulativeWidth = 0;		
		// append a group to contain all lines
		var buttonGroup = graph.append("svg:g")
				.attr("class", "scale-button-group")
			.selectAll("g")
				.data(scales)
			.enter().append("g")
				.attr("class", "scale-buttons")
			.append("svg:text")
				.attr("class", "scale-button")
				.text(function(d, i) {
					return d[1];
				})
				.attr("font-size", "12")
				.attr("fill", function(d) {
					if(d[0] == yScale) {
						return "black";
					} else {
						return "blue";
					}
				})
				.classed("selected", function(d) {
					if(d[0] == yScale) {
						return true;
					} else {
						return false;
					}
				})
				.attr("x", function(d, i) {
					var returnX = cumulativeWidth;
					cumulativeWidth += this.getComputedTextLength()+5;
					return returnX;
				})
				.attr("y", -4)
				.on('click', function(d, i) {
					handleMouseClickScaleButton(this, d, i);
				});
	}

	var handleMouseClickScaleButton = function(button, buttonData, index) {
		if(index == 0) {
			self.switchToLinearScale();
		}
		// change text decoration
		graph.selectAll('.scale-button')
		.attr("fill", function(d) {
			if(d[0] == yScale) {
				return "black";
			} else {
				return "blue";
			}
		})
		.classed("selected", function(d) {
			if(d[0] == yScale) {
				return true;
			} else {
				return false;
			}
		})
		
	}
	
    // Create a data label
	var createDateLabel = function() {
		var date = new Date(); 
		// create the date label to the left of the scaleButtons group
		var buttonGroup = graph.append("svg:g")
				.attr("class", "date-label-group")
			.append("svg:text")
				.attr("class", "date-label")
				.attr("text-anchor", "end") // set at end so we can position at far right edge and add text from right to left
				.attr("font-size", "10") 
				.attr("y", -4)
				.attr("x", w)
				.text(date.toDateString() + " " + date.toLocaleTimeString())
				
	}
	
	 // Called when a user mouses over a line.
	var handleMouseOverLine = function(lineData, index) {
		//debug("MouseOver line [" + containerId + "] => " + index)
		
		// user is interacting
		userCurrentlyInteracting = true;
	}

    //Called when a user mouses over the graph.
	var handleMouseOverGraph = function(event) {	
		var mouseX = event.pageX-hoverLineXOffset;
		var mouseY = event.pageY-hoverLineYOffset;
		
		if(mouseX >= 0 && mouseX <= w && mouseY >= 0 && mouseY <= h) {
			hoverLine.classed("hide", false);
			hoverLine.attr("x1", mouseX).attr("x2", mouseX)
			displayValueLabelsForPositionX(mouseX)
			userCurrentlyInteracting = true;
			currentUserPositionX = mouseX;
		} else {
			handleMouseOutGraph(event)
		}
	}
	
	var handleMouseOutGraph = function(event) {	
		// hide the hover-line
		hoverLine.classed("hide", true);
		setValueLabelsToLatest();
		userCurrentlyInteracting = false;
		currentUserPositionX = -1;
	}
	
	// Handler for when data is updated.
	var handleDataUpdate = function() {
		if(userCurrentlyInteracting) {
			if(currentUserPositionX > -1) {
				displayValueLabelsForPositionX(currentUserPositionX)
			}
		} else {
			setValueLabelsToLatest();
		}
	}
	
    //  Display the data values at position X in the legend value labels.
	var displayValueLabelsForPositionX = function(xPosition, withTransition) {
		var animate = false;
		if(withTransition != undefined) {
			if(withTransition) {
				animate = true;
			}
		}
		var dateToShow;
		var labelValueWidths = [];
		graph.selectAll("text.legend.value")
		.text(function(d, i) {
			var valuesForX = getValueForPositionXFromData(xPosition, i);
			dateToShow = valuesForX.date;
			return valuesForX.value;
		})
		.attr("x", function(d, i) {
			labelValueWidths[i] = this.getComputedTextLength();
		})

		// position label names
		var cumulativeWidth = 0;
		var labelNameEnd = [];
		graph.selectAll("text.legend.name")
				.attr("x", function(d, i) {
					var returnX = cumulativeWidth;
					cumulativeWidth += this.getComputedTextLength()+4+labelValueWidths[i]+8;
					labelNameEnd[i] = returnX + this.getComputedTextLength()+5;
					return returnX;
				})

		// remove last bit of padding from cumulativeWidth
		cumulativeWidth = cumulativeWidth - 8;

		if(cumulativeWidth > w) {
			// decrease font-size to make fit
			legendFontSize = legendFontSize-1;
			//debug("making legend fit by decreasing font size to: " + legendFontSize)
			graph.selectAll("text.legend.name")
				.attr("font-size", legendFontSize);
			graph.selectAll("text.legend.value")
				.attr("font-size", legendFontSize);
			
			// recursively call until we get ourselves fitting
			displayValueLabelsForPositionX(xPosition);
			return;
		}

		// position label values
		graph.selectAll("text.legend.value")
		.attr("x", function(d, i) {
			return labelNameEnd[i];
		})
		

		// show the date
		graph.select('text.date-label').text(dateToShow.toDateString() + " " + dateToShow.toLocaleTimeString())

		// move the group of labels to the right side
		if(animate) {
			graph.selectAll("g.legend-group g")
				.transition()
				.duration(transitionDuration)
				.ease("linear")
				.attr("transform", "translate(" + (w-cumulativeWidth) +",0)")
		} else {
			graph.selectAll("g.legend-group g")
				.attr("transform", "translate(" + (w-cumulativeWidth) +",0)")
		}
	}
	
    // Set the value labels to whatever the latest data point is.
	var setValueLabelsToLatest = function(withTransition) {
		displayValueLabelsForPositionX(w, withTransition);
	}
	

	var getValueForPositionXFromData = function(xPosition, dataSeriesIndex) {
		var d = data.values[dataSeriesIndex]
		
		// get the date on x-axis for the current location
		var xValue = x.invert(xPosition);

		// Calculate the value from this date by determining the 'index'
		// within the data array that applies to this value
		var index = (xValue.getTime() - data.startTime) / data.step;


		if(index >= d.length) {
			index = d.length-1;
		}
		index = Math.round(index);

		// bucketDate is the date rounded to the correct 'step' instead of interpolated
		var bucketDate = new Date(data.startTime.getTime() + data.step * (index+1)); // index+1 as it is 0 based but we need 1-based for this math
				
		var v = d[index];

		var roundToNumDecimals = data.rounding[dataSeriesIndex];

		return {value: roundNumber(v, roundToNumDecimals), date: bucketDate};
	}

	
	
    //Called when the window is resized to redraw graph accordingly.
	var handleWindowResizeEvent = function() {
	 	//debug("Window Resize Event [" + containerId + "] => resizing graph")
	 	initDimensions();
		initX();
		
		// reset width/height of SVG
		d3.select("#" + containerId + " svg")
				.attr("width", w + margin[1] + margin[3])
				.attr("height", h + margin[0] + margin[2]);

		// reset transform of x axis
		graph.selectAll("g .x.axis")
			.attr("transform", "translate(0," + h + ")");
			
		if(yAxisRight != undefined) {
			// Reset the y-axisRight transform if it exists
			graph.selectAll("g .y.axis.right")
				.attr("transform", "translate(" + (w+10) + ",0)");
		}

		// reset legendFontSize on window resize so it has a chance to re-calculate to a bigger size if it can now fit 
		legendFontSize = 12;
		//debug("making legend fit by decreasing font size to: " + legendFontSize)
		graph.selectAll("text.legend.name")
			.attr("font-size", legendFontSize);
		graph.selectAll("text.legend.value")
			.attr("font-size", legendFontSize);

		// move date label
		graph.select('text.date-label')
			.transition()
			.duration(transitionDuration)
			.ease("linear")
			.attr("x", w)

		// redraw the graph with new dimensions
		redrawAxes(true);
		redrawLines(true);
		
		// reposition legend if necessary
		redrawLegendPosition(true);
				
		// force legend to redraw values
		setValueLabelsToLatest(true);
	}

    // Set height/width dimensions based on container.
	var initDimensions = function() {
		// automatically size to the container using JQuery to get width/height
		w = $("#" + containerId).width() - margin[1] - margin[3]; // width
		h = $("#" + containerId).height() - margin[0] - margin[2]; // height
		
		// make sure to use offset() and not position() as we want it relative to the document, not its parent
		hoverLineXOffset = margin[3]+$(container).offset().left;
		hoverLineYOffset = margin[0]+$(container).offset().top;
	}
	
	// Return the value from argsMap for key or throw error if no value found
	var getRequiredVar = function(argsMap, key, message) {
		if(!argsMap[key]) {
			if(!message) {
				throw new Error(key + " is required")
			} else {
				throw new Error(message)
			}
		} else {
			return argsMap[key]
		}
	}
	
	// Return the value from argsMap for key or defaultValue if no value found
	var getOptionalVar = function(argsMap, key, defaultValue) {
		if(!argsMap[key]) {
			return defaultValue
		} else {
			return argsMap[key]
		}
	}
	
	var error = function(message) {
		console.log("ERROR: " + message)
	}

	var debug = function(message) {
		console.log("DEBUG: " + message)
	}
	
	// round a number to X digits: num => the number to round, dec => the number of decimals 
    function roundNumber(num, dec) {
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		var resultAsString = result.toString();
		if(dec > 0) {
			if(resultAsString.indexOf('.') == -1) {
				resultAsString = resultAsString + '.';
			}
			// make sure we have a decimal and pad with 0s to match the number we were asked for
			var indexOfDecimal = resultAsString.indexOf('.');
			while(resultAsString.length <= (indexOfDecimal+dec)) {
				resultAsString = resultAsString + '0';
			}
		}
		return resultAsString;
	};
	
	_init();
};