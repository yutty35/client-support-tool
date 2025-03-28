//
// COnverter - bluepage_info
//
console.log("[bluepage_info/index.js]")

var express = require('express');
var router = express.Router();

var fs = require('fs');

var PDFDocument = require('pdfkit');
var archiver = require('archiver');

UPLOAD_FOLDER = './public/upload';
DOWNLOAD_FOLDER = "./public/download";

//
// dayjs
//
var dayjs = require("dayjs");
datetime = dayjs().format("YYYY-MM-DD HH:mm:ss");

//
// axios
//
const axios = require("axios");

//
// write-excel-file
// https://www.npmjs.com/package/write-excel-file
//
const writeXlsxFile = require('write-excel-file/node')

//
// Top page
//
router.get("/", (req, res, next) => {

	console.log("[bluepage_info] GET");

	res.render("bluepage_info/index",
	{
	});
});

//
// Searching
//
router.post("/search_bluepage/:key", async (req, res, next) => {
	console.log("[/bluepage_info/search_bluepage] POST");
	
	search_key = req.params.key;
	
	result = []

	//
	// Unified-Profile API
	// https://w3-unifiedprofile-api.dal1a.cirrus.ibm.com/v3/api
	//
	if (search_key == "ids") {
		search_data = req.body.internet_ids.split('\r\n')
		BP_URL = "https://w3-unifiedprofile-api.dal1a.cirrus.ibm.com/v3/profiles/"
	} else if(search_key == "cnum") {
		search_data = req.body.cnums.split('\r\n')
		BP_URL = "https://w3-unifiedprofile-api.dal1a.cirrus.ibm.com/v3/profiles/"
	}

	let keys = ""
	search_data.forEach(s => {
		if (s.trim().lebgth != 0) { // 改行は検索対象外
			keys += s + ",";
		}
	});
	keys = keys.slice(0, -1)

	error_info = "";

	try {
		const response = await axios.get(BP_URL + keys);

		status = "success";
		data = response.data.profiles;
		errors = response.data.errors;
	} catch (error) {
		status = "error";
		console.log("> Status", status)
		data = errors = [];
		error_info = error.response.data;
		console.log("error", error_info);
	}

	if (data != undefined) { 
		data.forEach(d => {
			r = {};
			r.uid = d.content.uid;
			r.preferredIdentity = d.content.preferredIdentity;
			r.nameDisplay = d.content.nameDisplay;
			r.costCenter = d.content.costCenter;
			r.co = d.content.co;
			r.functionalManager = d.content.functionalManager; // nameDisplay, preferredIdentity, uid
			
			if (d.content.inCountryManager != undefined) {
				r.inCountryManager = d.content.inCountryManager;
			} else {
				r.inCountryManager = {
					nameDisplay: "",
					preferredIdentity: "",
					uid: ""
				};	
			}
			
			result.push(r);
		});
	}

	if (errors != undefined) {
		errors.forEach(e => {
			r = {};
			if (search_key == "cnum") {
				r.uid = e.userId;
				r.preferredIdentity = "";
			} else if (search_key == "ids") {
				r.uid = "";
				r.preferredIdentity = e.mail;
			}
			r.nameDisplay = "";
			r.costCenter = "";
			r.co = "";
			r.functionalManager = {
				nameDisplay: "",
				preferredIdentity: "",
				uid: ""
			};
			r.inCountryManager = {
				nameDisplay: "",
				preferredIdentity: "",
				uid: ""
			};

			result.push(r);
		});
	}

	console.log("> result", result)

	if (result.length == search_data.length) {
		excel_header = [ 
			{ type: String, value: "uid" },
			{ type: String, value: "preferredIdentity" },
			{ type: String, value: "nameDisplay" },
			{ type: String, value: "costCenter" },
			{ type: String, value: "co" },
			{ type: String, value: "functionalManager.uid" },
			{ type: String, value: "functionalManager.preferredIdentity" },
			{ type: String, value: "functionalManager.nameDisplay" },
			{ type: String, value: "inCountryManager.uid" },
			{ type: String, value: "inCountryManager.preferredIdentity" },
			{ type: String, value: "inCountryManager.nameDisplay" },
		];
		excel_data = [];
		excel_data.push(excel_header);
		
		result.forEach((r) => {
			e_data = [ 
				{ type: String, value: r.uid },
				{ type: String, value: r.preferredIdentity },
				{ type: String, value: r.nameDisplay },
				{ type: String, value: r.costCenter },
				{ type: String, value: r.co },
				{ type: String, value: r.functionalManager.uid },
				{ type: String, value: r.functionalManager.preferredIdentity },
				{ type: String, value: r.functionalManager.nameDisplay },
				{ type: String, value: r.inCountryManager.uid },
				{ type: String, value: r.inCountryManager.preferredIdentity },
				{ type: String, value: r.inCountryManager.nameDisplay },
			]
			excel_data.push(e_data);
		});

		current_timestamp = dayjs().format("YYYYMMDDHHMMss");
		excel_file_name = "bluepage_result_" + current_timestamp + ".xlsx";
		
		await writeXlsxFile(excel_data, {
			//	columns, // (optional) column widths, etc.
			headerStyle: {
				color: "#FFFFFF",
				backgroundColor: '#4F68DC',
				fontWeight: 'bold',
				align: 'center'
			},
			sheet: "Search Result",
			filePath: DOWNLOAD_FOLDER + "/" + excel_file_name
		});
		
	} else {
	//	console.log("> NO excel_data")
		excel_file_name = "no_excel_file";
	}

	res.render("bluepage_info/result",
	{
		status: status,
		result: result,
		error_info: error_info,
		excel_file_name: excel_file_name
	});
	
	return;
});

module.exports = router;