//
// cloudant_download
//
var express = require('express');
var router = express.Router();

//
// Get data from Cloudant NoSQL DB
//
console.log("> Cloudant Download")

// var env;
// var cfenv = require('cfenv');
// ((process.env.ENV == "prod") || (process.env.ENV == "nonprod")) ? env = "server" : env = "local";
// (env == "server") ? APPL_URL = process.env.APPL_URL : APPL_URL = "";

var fs = require('fs').promises;

DOWNLOAD_FOLDER = "./public/download";

// var archiver = require('archiver');
const {zip, unzip, list} = require('zip-unzip-promise');

//
// dayjs
//
const dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc")
var timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc)
dayjs.extend(timezone);
console.log("> dayjs", dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss"));

//
// @ibm-cloud/cloudant 2022.07.28
//
var database = require('../database');
client = database.database()

console.log("> process.env.ENV:", process.env.ENV);
if (process.env.ENV == "prod") {
	var db_sql_log = "sql_log";
} else if (process.env.ENV == "nonprod-uat") {
	var db_sql_log = "sql_log_uat";
} else {
	var db_sql_log = "sql_log_dev";
}

//
// Top Page 
//
router.get("/", (req, res, next) => {
	console.log("[index.js] GET");

	res.render("cloudant_download/index",
	{
		zip_file_name: "",
		url: "",
		api: "",
		all_data: [],
	});
});

//
// get_data
//
router.post("/get_data", async (req, res, next) => {
	console.log("[index.js/get_data] GET");
	
	//
	// Cloudant Document
	// https://cloud.ibm.com/apidocs/cloudant?code=node
	//
	var CLOUDANT_API = req.body.apikey
	var CLOUDANT_URL = req.body.url
	console.log("> CLOUDANT_API", CLOUDANT_API)
	console.log("> CLOUDANT_URL", CLOUDANT_URL)

	process.env['CLOUDANT_AUTH_TYPE'] = 'IAM';
	process.env['CLOUDANT_APIKEY'] = CLOUDANT_API 
	process.env['CLOUDANT_URL'] = CLOUDANT_URL;
 
	const { CloudantV1 } = require( '@ibm-cloud/cloudant' );
	const service = CloudantV1.newInstance( { serviceName: 'CLOUDANT', disableSslVerification: true } ); 

//	const responseServerInformation = await service.getServerInformation();
//	const { version } = responseServerInformation.result;
//	console.log(`Server version ${version}`);

	response = await service.getAllDbs();
	all_dbs = response.result;
	files = [];
	all_data = {};

	f = 0;
	for (i = 0; i < all_dbs.length; i++) {
		db = all_dbs[i]
		console.log(db);
		
		if (db != "_replicator") {
			console.log("Downloading table:", db);
			
			response = await service.postAllDocs({
				db: db,
				includeDocs: true,
			});

			data = response.result.rows;
			console.log(data)

			
			all_data[db] = data;
			
			files[f] = DOWNLOAD_FOLDER + "/" + db + ".json"
			await fs.writeFile(files[f], JSON.stringify(data, null, "\t"));
			f += 1;
		}

		datetime = dayjs().tz("Asia/Tokyo").format("YYYYMMDD_HHmmss")
	}

	//
	// zipファイルに圧縮
	//
	console.log("> Zip all files");
	var zip_file_name = download_folder + "/" + datetime + ".zip"

	const zipPath = await zip(files, zip_file_name);
	
	files.forEach(f => {
		fs.unlink(f);
	});

	res.render("cloudant_download/index", {
		zip_file_name: zip_file_name.slice(8),
		url: CLOUDANT_URL,
		api: CLOUDANT_API,
		all_data: all_data
	});
});

module.exports = router;