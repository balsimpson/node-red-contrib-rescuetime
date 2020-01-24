const https = require('https');

const makeHttpCall = async (options) => {
	try {
		return new Promise((resolve) => {
			var req = https.request(options, res => {
				res.setEncoding('utf8');
				var returnData = "";
				res.on('data', chunk => {
					returnData = returnData + chunk;
				});
				res.on('end', () => {
					let results = JSON.parse(returnData);
					resolve(results);
				});
			});
			if (options.method == 'POST' || options.method == 'PATCH') {
				req.write(JSON.stringify(options.body));
			}
			req.end();
		})
	} catch (error) {
		return `error: ` + error;
	}
}

const getRescuetimeData = async (data) => {
	let path = `/anapi/daily_summary_feed?key=${data.key}&format=json`;

	if (data.kind) {
		path = `/anapi/data?key=${data.key}&perspective=interval&restrict_kind=${data.kind}&interval=${data.interval}&restrict_begin=${data.begin}&restrict_end=${data.end}&format=json`
	}
	let options = {
		host: 'www.rescuetime.com',
		port: 443,
		path: path,
		headers: {
			'Content-Type': 'application/json',
			"charset": 'utf-8'
		},
		method: 'GET'
	};

	// console.log(options.host + options.path);
	let results = await makeHttpCall(options);
	return results;
}

const getAnalytics = async (data) => {
	let options = {
		host: 'www.rescuetime.com',
		port: 443,
		path: `/anapi/data?key=${data.key}&perspective=interval&restrict_kind=${data.kind}&interval=${data.interval}&restrict_begin=${data.begin}&restrict_end=${data.end}&format=json`,
		headers: {
			'Content-Type': 'application/json',
			"charset": 'utf-8'
		},
		method: 'GET'
	};

	// console.log(options.host + options.path);
	let results = await makeHttpCall(options);
	let return_data;

	let data_kind = data.kind;

	switch (data_kind) {
		case 'overview':
			return_data = getOverview(results);
			break;
		case 'productivity':
			return_data = getProductivity(results);
			break;
		case 'category':
			return_data = getCategory(results);
			break;
		case 'activity':
			return_data = getActivity(results);
			break;

		default:
			break;
	}

	// return results;
	return return_data;
}

const getSummary = async (api_key) => {
	///anapi/daily_summary_feed?key=YOUR_API_KEY
	let options = {
		host: 'www.rescuetime.com',
		port: 443,
		path: `/anapi/daily_summary_feed?key=${api_key}&format=json`,
		headers: {
			'Content-Type': 'application/json',
			"charset": 'utf-8'
		},
		method: 'GET'
	};

	// console.log(options.host + options.path);

	let results = await makeHttpCall(options);

	let total_productivity_pulse = 0;
	let total_productive_percentage = 0;
	let total_distracted_percentage = 0;
	let total_hours = 0;
	let productivity_pulse = [];
	let top_productive_percentage = 0;
	let top_distracted_percentage = 0;
	let top_productive_day = '';
	let top_distracted_day = '';
	let category_total = {
		business: 0,
		communication_and_scheduling: 0,
		social_networking: 0,
		design_and_composition: 0,
		entertainment: 0,
		news: 0,
		software_development: 0,
		reference_and_learning: 0,
		shopping: 0,
		utilities: 0,
		uncategorized: 0
	}

	let summary_data = results.map(result => {

		let data = {
			date: result.date,
			time_summary: {
				total_hours: result.total_hours,
				productive_hours: result.all_productive_hours,
				productive_duration: result.all_productive_duration_formatted,
				distracted_hours: result.all_distracting_hours,
				distracted_duration: result.all_distracting_duration_formatted,
				uncategorized_hours: result.uncategorized_hours,
				uncategorized_duration: result.uncategorized_duration_formatted
			},
			percentage_summary: {
				productive_percentage: result.all_productive_percentage,
				distracted_percentage: result.all_distracting_percentage,
				uncategorized_percentage: result.uncategorized_percentage,
			},
			categories: {
				business: [result.business_percentage + '%', result.business_hours, result.business_duration_formatted],
				communication_and_scheduling: [result.communication_and_scheduling_percentage + '%', result.communication_and_scheduling_hours, result.communication_and_scheduling_duration_formatted],
				social_networking: [result.social_networking_percentage + '%', result.social_networking_hours, result.social_networking_duration_formatted],
				design_and_composition: [result.design_and_composition_percentage + '%', result.design_and_composition_hours, result.design_and_composition_duration_formatted],
				entertainment: [result.entertainment_percentage + '%', result.entertainment_hours, result.entertainment_duration_formatted],
				news: [result.news_percentage + '%', result.news_hours, result.news_duration_formatted],
				software_development: [result.software_development_percentage + '%', result.software_development_hours, result.software_development_duration_formatted],
				reference_and_learning: [result.reference_and_learning_percentage + '%', result.reference_and_learning_hours, result.reference_and_learning_duration_formatted],
				shopping: [result.shopping_percentage + '%', result.shopping_hours, result.shopping_duration_formatted],
				utilities: [result.utilities_percentage + '%', result.utilities_hours, result.utilities_duration_formatted]
			},
			productivity_pulse: result.productivity_pulse
		}

		// top productive day
		if (result.all_productive_percentage > top_productive_percentage) {
			top_productive_percentage = result.all_productive_percentage;
			top_productive_day = [result.date, result.all_productive_percentage, result.all_productive_hours]
		}
		// top distracted day
		if (result.all_distracting_percentage > top_distracted_percentage) {
			top_distracted_percentage = result.all_distracting_percentage;
			top_distracted_day = [result.date, result.all_distracting_percentage]
		}

		// total hours
		total_hours += result.total_hours;
		total_productivity_pulse += result.productivity_pulse;
		// productivity_pulse array
		productivity_pulse.push({ [result.date]: result.productivity_pulse });
		// total percentage
		total_productive_percentage += result.all_productive_percentage;
		total_distracted_percentage += result.all_distracting_percentage;

		// update category totals
		category_total.business += result.business_hours;
		category_total.communication_and_scheduling += result.communication_and_scheduling_hours;
		category_total.social_networking += result.social_networking_hours;
		category_total.design_and_composition += result.design_and_composition_hours;
		category_total.entertainment += result.entertainment_hours;
		category_total.news += result.news_hours;
		category_total.software_development += result.software_development_hours;
		category_total.reference_and_learning += result.reference_and_learning_hours;
		category_total.shopping += result.shopping_hours;
		category_total.utilities += result.utilities_hours;
		category_total.uncategorized += result.uncategorized_hours;

		return data;
	});

	let return_data = {
		days_logged: summary_data.length,
		total_hours: Math.round(total_hours),
		avg_productivity_pulse: Math.round(total_productivity_pulse / summary_data.length),
		productivity_pulse: productivity_pulse,
		avg_productive_percentage: Math.round(total_productive_percentage / summary_data.length),
		avg_distracted_percentage: Math.round(total_distracted_percentage / summary_data.length),
		top_productive_day: top_productive_day, //date, hours, percentage
		top_distracted_day: top_distracted_day,
		categories_total_hours: {
			business: Math.round(category_total.business),
			communication_and_scheduling: Math.round(category_total.communication_and_scheduling),
			social_networking: Math.round(category_total.social_networking),
			design_and_composition: Math.round(category_total.design_and_composition),
			entertainment: Math.round(category_total.entertainment),
			news: Math.round(category_total.news),
			software_development: Math.round(category_total.software_development),
			reference_and_learning: Math.round(category_total.reference_and_learning),
			shopping: Math.round(category_total.shopping),
			utilities: Math.round(category_total.utilities),
			uncategorized: Math.round(category_total.uncategorized)
		}
	};

	// return results;
	return return_data;
}

/**
* A basic Hello World function
* @param {object} data API response data from rescuetime
* @param {string} data_type Can be activity | document | category | productivity
* @param {boolean} datewise Group data datewise if true
* @param {string} format Make time text readable if 'readable'
* @returns {object.http}
*/
function getDetails(data, data_type, datewise = false, format) {
	let type_index = 0;

	let results = {};

	switch (data_type) {
		case 'activity':
			type_index = 3;
			break;
		case 'document':
			type_index = 4;
			break;
		case 'category':
			type_index = 5;
			break;
		case 'productivity':
			type_index = 6;
			break;
		default:
			type_index = 6;
			break;
	}

	data.rows.map(row => {
		let date = row[0].substr(0, 10);
		let duration = row[1];
		let category = row[type_index];

		if (typeof category === 'number') {
			if (category === 2) {
				category = 'very_productive'
			}
			if (category === 1) {
				category = 'productive'
			}
			if (category === 0) {
				category = 'neutral'
			}
			if (category === -1) {
				category = 'unproductive'
			}
			if (category === -2) {
				category = 'very_unproductive'
			}
		}
		// console.log(category)

		if (datewise) {
			getDateWise(date, category, duration);
		} else {
			getCategoryWise(duration, category);
		}
	})

	const compare = (a, b) => {

		if (a[1] > b[1])
			return -1;
		if (a[1] < b[1])
			return 1;
		return 0;
	};

	results = Object.entries(results)
		.sort(compare)
		.reduce((accum, [k, v]) => {
			accum[k] = v;
			return accum;
		}, {});

	if (datewise && format === 'readable') {
		for (key in results) {
			for (j in results[key]) {
				results[key][j] = getDurationTxt(results[key][j]);
			}
		}
	} else if (format === 'readable') {
		for (key in results) {
			results[key] = getDurationTxt(results[key]);
		}
	}

	return results;

	function getDateWise(date, category, duration) {
		if (results[date]) {
			if (results[date][category]) {
				results[date][category] += parseInt(duration);
			}
			else {
				results[date][category] = parseInt(duration);
			}
			results[date].total += parseInt(duration);
		}
		else {
			results[date] = {
				total: 0,
				[category]: parseInt(duration)
			};
			results[date].total += parseInt(duration);
		}
	}

	function getCategoryWise(duration, category) {
		if (results.total) {
			results.total += parseInt(duration);
		}
		else {
			results.total = parseInt(duration);
		}
		if (results[category]) {
			results[category] += parseInt(duration);
		}
		else {
			results[category] = parseInt(duration);
		}
	}
}

function getDurationTxt(duration_seconds) {
	let durMinutes = (duration_seconds / 60).toFixed(0);
	let dur = '';
	if (durMinutes >= 60) {
		dur = (durMinutes / 60).toFixed(0) + ' hr';
		if (durMinutes % 60 > 10) {
			dur += ' ' + durMinutes % 60 + ' min';
		}
	} else {
		dur = durMinutes + ' min';
	}
	return dur;
}

module.exports = function (RED) {
	function RescuetimeNode(config) {
		RED.nodes.createNode(this, config);
		let node = this;

		console.log(`config: ${JSON.stringify(config, null, 2)}`);
		
		node.on('input', function (msg) {
			node.status({ fill: "green", shape: "ring", text: 'requesting' });
			let key = RED.nodes.getNode(config.key);
			let results;
			let data = {
				key: key.api,
				kind: config.restrictkind,
				interval: config.interval,
				begin: config.restrictbegin,
				end: config.restrictend,
				grouping: config.grouping,
				timeformat: config.timeformat
			}

			if (config.datatype === 'analytic') {
				node.log(`data: ${JSON.stringify(data, null, 2)}`);
				results = getRescuetimeData(data);
			} else {
				results = getSummary(key.api);
			}

			results.then((value) => {
				try {
					node.status({ fill: "green", shape: "dot", text: 'success' });
					msg.payload = value;
					// msg.results = value.results;
					// RED.util.setMessageProperty(msg, node.property, value);
					node.send(msg);

				} catch (error) {
					node.status({ fill: "red", shape: "dot", text: 'error' });
					node.error(error);
				}

			});
		});
	}


	RED.nodes.registerType("rescuetime", RescuetimeNode);

	function RescuetimeConfigNode(n) {
		RED.nodes.createNode(this, n);
		this.api = n.api;
	}
	RED.nodes.registerType("rescuetime-config", RescuetimeConfigNode);
}

