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

const getOverview = (results) => {
	// console.log(`results: ${JSON.stringify(results, null, 2)}`);

	let categories = {};

	results.rows.map(result => {
		if (categories[result[3]]) {
			categories[result[3]] += Math.round((result[1] / 60));
		} else {
			categories[result[3]] = Math.round((result[1] / 60));
		}
	});

	const compare = (a, b) => {
		if (a.time > b.time)
			return -1;
		if (a.time < b.time)
			return 1;
		return 0;
	}

	let keys = Object.keys(categories);
	let categories_sorted = [];

	for (let i = 0; i < keys.length; i++) {
		const element = keys[i];
		categories_sorted.push({
			name: keys[i],
			time: categories[keys[i]]
		});
	}

	categories_sorted.sort(compare);

	let return_data = {
		categories: categories_sorted,
		results: results
	}

	return return_data;
}

const getProductivity = (results) => {
	let productivity = {};
	let total_minutes = 0;

	results.rows.map(result => {
		total_minutes += Math.round((result[1] / 60));
		if (productivity[result[3]]) {
			productivity[result[3]] += Math.round((result[1] / 60));
		} else {
			productivity[result[3]] = Math.round((result[1] / 60));
		}
	});

	let return_data = {
		total_minutes: total_minutes,
		very_productive: productivity['2'],
		productive: productivity['1'],
		neutral: productivity['0'],
		unproductive: productivity['-1'],
		very_unproductive: productivity['-2']
	}

	return return_data;
}

const getCategory = (results) => {
	let categories = {};
	let total_minutes = 0;

	results.rows.map(result => {
		total_minutes += Math.round((result[1] / 60));
		if (categories[result[3]]) {
			categories[result[3]] += Math.round((result[1] / 60));
		} else {
			categories[result[3]] = Math.round((result[1] / 60));
		}
	});

	const compare = (a, b) => {
		if (a.time_minutes > b.time_minutes)
			return -1;
		if (a.time_minutes < b.time_minutes)
			return 1;
		return 0;
	}

	let keys = Object.keys(categories);
	let categories_sorted = [];

	for (let i = 0; i < keys.length; i++) {
		const element = keys[i];
		categories_sorted.push({
			name: keys[i],
			time_minutes: categories[keys[i]]
		});
	}

	categories_sorted.sort(compare);

	let return_data = {
		categories: categories_sorted,
		results: results
	}

	return return_data;
}

const getActivity = (results) => {
	
	let total_minutes = 0;
	let activities = {};
	let categories = {};

	results.rows.map(result => {
		total_minutes += Math.round((result[1] / 60));
		if (categories[result[4]]) {
			categories[result[4]] += Math.round((result[1] / 60));
		} else {
			categories[result[4]] = Math.round((result[1] / 60));
		}
		if (activities[result[3]]) {
			activities[result[3]] += Math.round((result[1] / 60));
		} else {
			activities[result[3]] = Math.round((result[1] / 60));
		}
	});

	const compare = (a, b) => {
		if (a.time_minutes > b.time_minutes)
			return -1;
		if (a.time_minutes < b.time_minutes)
			return 1;
		return 0;
	}

	let category_keys = Object.keys(categories);
	let categories_sorted = [];
	for (let i = 0; i < category_keys.length; i++) {
		const element = category_keys[i];
		categories_sorted.push({
			name: category_keys[i],
			time_minutes: categories[category_keys[i]]
		});
	}
	categories_sorted.sort(compare);

	let activity_keys = Object.keys(activities);
	let activities_sorted = [];
	for (let i = 0; i < activity_keys.length; i++) {
		const element = activity_keys[i];
		activities_sorted.push({
			name: activity_keys[i],
			time_minutes: activities[activity_keys[i]]
		});
	}
	activities_sorted.sort(compare);

	let return_data = {
		activities: activities_sorted,
		categories: categories_sorted,
		results: results
	}

	return return_data;
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
				end: config.restrictend
			}

			if (config.datatype === 'analytic') {
				console.log(`data: ${JSON.stringify(data, null, 2)}`);
				results = getAnalytics(data);
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

