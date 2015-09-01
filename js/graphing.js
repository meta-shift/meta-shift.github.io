// Constants
var DATA_TYPES = ['CHAMPIONS','ITEMS']; 
var QUEUE_TYPES = ['NORMAL_5X5', 'RANKED_SOLO'];
var REGIONS = ['BR', 'EUNE', 'EUW', 'KR', 'LAN', 'LAS', 'NA', 'OCE', 'RU', 'TR']
var COMMON_PROPERTIES = [ 'd_pr','d_wr','post_pr','post_wr','pre_pr','pre_wr'] // Properties common to all champion/object items, used for aggregation between data sets
var ABBREVIATIONS = {'wr':'Win Rate','pr':'Popularity'}
var DEFAULT_INFO = 'wr';

var championKey;
var jsonData;
var $table;
var chart;
var dataSeries = { // The series responsible for the horizontal bar on the graph
	'currentInfo' : DEFAULT_INFO,
	'type' : 'columnrange'
};
var markerSeries = { // The series responsible for the 'arrow' effect in the direction of the change
'currentInfo' : DEFAULT_INFO,
'type' : 'scatter'
};
var options;
var currentInfo = 'wr' 
var needsNewChart = true;

$(function() {
	$('input[type=checkbox][value=normal_5x5]').attr('checked',true);
	$('input[type=checkbox][value=NA]').attr('checked',true);

	$table = $('#example').DataTable({
		"bPaginate": false,
		"columnDefs": [
		{
			"targets": [ 7,8,9,10,11,12,13,14,15,16 ],
			"visible": false
		}
		]
	});

	$.getJSON('json/CHAMPION_KEY_NAME.json').done(function(data) {
		championKey = data;
		generateDataSet(generateSelection());

		// Signifies that a new chart & data set must be generated when a new data set selection is chosen
		$('input[type=checkbox]').change(function() {
			needsNewChart = true;
		}); 
		// Generates a new chart with the info type chosen (win / pick)
		$('input[type=radio]').change(function() {
			currentInfo = this.value;
			generateDataSet(generateSelection(), $('#sort-type').val());
		})
		// Sorts the current data set by the given value
		$('#sort-type').change(function() {
			sort($(this).val());
		})
		// Updates the chart based on all the selections
		$('#update-selection').on('click', function() {
			var sortProperty = $('#sort-type').val()
			if (needsNewChart) {
				generateDataSet(generateSelection(), sortProperty);
			}
			needsNewChart = false;
			if (sortProperty != 'name') {
				sort(sortProperty);
			}
		});	
		$('#wins-picks-chart').on('click', function(){
			if ($(this).hasClass('active') && !$('#roles-chart').hasClass('active')) {
				return;
			}
			$(this).hasClass('active') ? $(this).removeClass('active') : $(this).addClass('active');
			for (var i=1; i<=6; i++) {
				var column = $table.column( i );
				column.visible( ! column.visible() );
			}
		});

		$('#roles-chart').on('click', function(){
			if ($(this).hasClass('active') && !$('#wins-picks-chart').hasClass('active')) {
				return;
			}
			$(this).hasClass('active') ? $(this).removeClass('active') : $(this).addClass('active');
			for (var i=7; i<=16; i++) {
				var column = $table.column( i );
				column.visible( ! column.visible() );
			}
		});
	});
});

function generateTable(jsonData) {
	$table.clear();
	jsonData.forEach(function(champion) {
		var d_wr = champion['d_wr'] >= 0.0 ? green(champion['d_wr'].toFixed(2) + "%") : red(champion['d_wr'].toFixed(2) + "%");
		var d_pr = champion['d_pr'] >= 0.0 ? green(champion['d_pr'].toFixed(2) + "%") : red(champion['d_pr'].toFixed(2) + "%");
		$table.row.add( [
			champion['name'],
			champion['pre_wr'].toFixed(2) + "%",
			champion['post_wr'].toFixed(2) + "%",
			d_wr,
			champion['pre_pr'].toFixed(2) + "%",
			champion['post_pr'].toFixed(2) + "%",
			d_pr,
			champion['pre_roles']['fighter'].toFixed(2) + "%",
			champion['post_roles']['fighter'].toFixed(2) + "%",
			champion['pre_roles']['mage'].toFixed(2) + "%",
			champion['post_roles']['mage'].toFixed(2) + "%",
			champion['pre_roles']['marksman'].toFixed(2) + "%",
			champion['post_roles']['marksman'].toFixed(2) + "%",
			champion['pre_roles']['support'].toFixed(2) + "%",
			champion['post_roles']['support'].toFixed(2) + "%",
			champion['pre_roles']['tank'].toFixed(2) + "%",
			champion['post_roles']['tank'].toFixed(2) + "%",
			] );
	});
	$table.draw();

}


// Generates a selection object from checkboxes; used to choose appropriate JSON files
function generateSelection() {
	var queue = [];
	$('input[type=checkbox][name=queue]').each(function() {
		if ($(this).prop('checked')) {
			queue.push($(this).val());
		}
	});
	var region = [];
	$('input[type=checkbox][name=region]').each(function() {
		if ($(this).prop('checked')) {
			region.push($(this).val());
		}
	})
	return {
		'data':'CHAMPIONS',
		'queue':queue, 
		'region':region 
	}
}

// After receiving the data set, generates the xAxis categories, two data series, and chart options before creating a new chart
// jsonData : an array of JSON objects containing information about champions/items
function generateChart(jsonData) {
	dataSeries.data = generateRangeData(jsonData, currentInfo);
	dataSeries.currentInfo = currentInfo;
	markerSeries.data = generateMarkerData(dataSeries.data,currentInfo);
	markerSeries.currentInfo = currentInfo;
	options = generateChartOptions(currentInfo);
	options.xAxis.categories = getCategories(dataSeries.data);

	options.series.push(dataSeries);
	options.series.push(markerSeries);

	chart = new Highcharts.Chart(options)
	needsNewChart = false;
}

// Uses selection argument to GET appropriate JSON files, combines them into one, and sorts them if necessary
// selection : an object containing properties 'data', 'queue', and 'region' (from generateSelection())
// sortProperty : a string indicating how to sort the data once it is retrieved 
function generateDataSet(selection, sortProperty) {
	// Input sanitation
	var dataType = selection['data'].toUpperCase()
	var queueList = [];
	$.each(selection['queue'], function(index, queue){
		queueList.push(queue.toUpperCase());
	})
	var regionList = [];
	$.each(selection['region'], function(index, region) {
		regionList.push(region.toUpperCase());
	})

	// Input validation
	if (dataType=='' || DATA_TYPES.indexOf(dataType)<0 || queueList.length==0 ||  !queueList.every(function(queue){
		return (QUEUE_TYPES.indexOf(queue)>=0);
	}) || regionList.length==0 || !regionList.every(function(region) {
		return (REGIONS.indexOf(region)>=0);
	})) {
		console.log('Invalid data set request:\ndataType: ' + dataType + '\nqueueList: ' + queueList + '\nregionList: ' + regionList);
	}
	else {

		// Compiles array of required JSON files
		var requests = [];
		var numOfSets = 0;
		var combined = [];
		for (var i = 0; i < queueList.length; i++) { // For each queue selected
			for (var j = 0; j < regionList.length; j++) { // For each region selected
				var request = $.getJSON('json/'+ queueList[i]+'_'+regionList[j]+'_'+selection.data +'.json');
					// When each request is done, add the pre_, post_, and d_ values to the combined array
					request.done(function(data) {
						numOfSets++;
						// If a base JSON has not been made, make one
						if (combined.length == 0) {
							data.forEach(function(entry) {
								var baseEntry = JSON.parse(JSON.stringify(entry));
								baseEntry.name = getNameById(baseEntry.id) // Ensures English names
								combined.push(baseEntry);
							});

						} else {					
							for (var i = 0; i < data.length; i++) {
								var champID = data[i]['id'];
								for (var j = 0; j < combined.length; j++) {
									if (combined[j].id == champID) {
										COMMON_PROPERTIES.forEach(function(property) {
											combined[j][property]+=data[i][property];
										});
										break;
									}
								}
								
							}
						}
					});
					requests.push(request);
				}
			}
			// Once all requests have completed, divide each property by the number of sets used to get an average
			$.when.apply($,requests).done(function() {
				for (var i = 0; i < combined.length; i++) {
					COMMON_PROPERTIES.forEach(function(property){
						combined[i][property] = roundOff(combined[i][property]/numOfSets);
					});
				}
					// Creates the chart
					generateChart(combined);
					// Sorts the chart if necessary
					if (sortProperty != 'name') {
						sort(sortProperty);
					}
					// Creates the table
					generateTable(combined);
				});
		}
	}

// Generates an array of data usable in columnrange charts to show a bar (high and low properties)	
// dataSet : an array of objects from which to determine the high and low properties 
// info : a string indicating what data is being displayed ('wr', 'pr')
function generateRangeData(dataSet, info) {
	for (var i = 0; i < dataSet.length; i++) {
		if (dataSet[i]['d_'+info] > 0) { // Rate increases
			dataSet[i].low = dataSet[i]['pre_'+info]; 
			dataSet[i].high = dataSet[i]['post_'+info];
		} else { // Rate decreases
			dataSet[i].low = dataSet[i]['post_'+info];
			dataSet[i].high = dataSet[i]['pre_'+info];
		}
		dataSet[i].currentInfo = info;
		dataSet[i].color = (dataSet[i]['d_'+info] > 0) ? 'rgb(20,230,20)' : 'rgb(230,20,20)'; // If the change is positive, the colour is green; if the change is negative, the colour is red
	}
	return dataSet;
}

// Generates an array of data usable in scatter charts to show arrows in the direction of change (y property)
// markerSet : an array of objects from which to determine the y property
// info : a string indicating what data is being displayed ('wr', 'pr')
function generateMarkerData(markerSet,info) {
	for (var i = 0; i < markerSet.length; i++) {
		markerSet[i].y = markerSet[i]['post_'+info];
		markerSet[i].marker = {
			'enabled':true,
			'symbol':(markerSet[i]['d_'+info] > 0) ? 'triangle' : 'triangle-down',
			'radius':5
		};
	}
	return markerSet;
}

// Generates the options of the chart
// info : a string indicating what data is being displayed ('wr', 'pr')
function generateChartOptions(info) {
	var infoType = ABBREVIATIONS[info];
	var yAxisLabel = '';
	if (info == 'wr'){
		yAxisLabel = 'Win Rate (games won/games picked)'
	} else if (info == 'pr') {
		yAxisLabel = 'Popularity (games picked/total games)';
	}
	var options = {
		'chart': {
			'renderTo':'container',
			'inverted': true,
		},
		'credits': {
			'enabled': false
		},
		'title': {
			'text': 'Change in '+ infoType + ' after Patch 5.13'
		},

		'xAxis': {
			'categories': [],
			'labels' : {
				'step' : 1
			},
			'alternateGridColor': '#FAFAFA'
		},

		'yAxis': [{
			'title': {
				'text': yAxisLabel
			},
			'plotLines': []			
		},
		{
			'title' : {
				'text': yAxisLabel
			},
			'linkedTo':0,
			'opposite':true
		}],
		'legend': {
			'enabled':false
		},

		'series': [],
		'tooltip': {
			'shared':true,
			'crosshairs':true,
			'followPointer':true,
			'hideDelay':100,
			'formatter':function() {
				var pt;
				if (typeof this.points == 'undefined'){
					pt = this.point;
				} else {
					pt = this.points[0].point;
				}
				var info = infoType.toLowerCase();
					// if change is negative, 5.11 > 5.14 and there's a decrease
					if (pt['d_'+pt.currentInfo] < 0 ) { 
						return '<em>' + pt.name + '</em><br>5.11 ' + info + ': ' +pt.high + '%<br>5.14 ' + info + ': ' + pt.low + '%<br>Change in ' + info + ': ' + roundOff((pt.low-pt.high))+'%';
					}
					// if change is positive, 5.11 < 5.14 and there's an increase
					return '<em>'+pt.name + '</em><br>5.11 ' + info + ': ' + pt.low + '%<br>5.14 ' + info + ': '+ pt.high + '%<br>Change in '+ info + ': +' + roundOff((pt.high-pt.low))+'%';
				}
			},
			'plotOptions': {
				'stickyTracking' : true
			}
		};
		if (info == 'wr') {
			options['yAxis'][0]['plotLines'].push({
				'value': 50,
				'width': 2,
				'color': '#AAAAAA',
				'dashStyle':'Dash',
				'zIndex': 5
			});	
		}
		return options;
	}
// Sorts the chart based on the property given
// property : a string identifying the property by which to sort the graph
function sort(property){
	dataSeries.data.sort(sortByProperty(property));
	$('#currently-sorting-by').html($("option[value="+property+"]").html());
	markerSeries.data = generateMarkerData(dataSeries.data,dataSeries.currentInfo);
	chart.xAxis[0].setCategories(getCategories(dataSeries.data));
	chart.series[0].update(chart.series[0].options);
	chart.series[1].update(chart.series[1].options);
}

// A function generator used by Arrays.sort to sort by the given property
// property : a string identifying the property by which to sort the array
function sortByProperty(property) {
	return function(a,b) {
		if (a[property] < b[property]) {
			return -1;
		} else if (a[property] > b[property]) {
			return 1;
		}
		return 0;
	}
}

// Returns an array of the given property for each element in dataSet
// dataSet : an array of objects from which to get the property
function getCategories(dataSet){
	var array = [];
	for (var i = 0; i < dataSet.length; i++){
		array.push(getNameById(dataSet[i].id))
	}
	return array;
}

//Returns the English name of a champion based on the id
// id : a number representing the champion id
function getNameById(id) {
	return championKey[id];
}

// Rounds a given number to two decimal places
// num : a number to round
function roundOff(num) {
	return parseFloat((Math.round(num*100.0)/100.0).toFixed(2));
}


// Returns a span with the text content with green styling
// text : a string indicating the text to colour green
function green(text){
	return "<span style='color:green'>" + text + "</span>";
}

// Returns a span with the text content with red styling
// text : a string indicating the text to colour red
function red(text){
	return "<span style='color:red'>" + text + "</span>";
}
