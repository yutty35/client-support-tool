//
// Access Logs
//
console.log("[bluepage_info/index.js]")

var express = require('express');
var router = express.Router();

var fs = require('fs');

//UPLOAD_FOLDER = './public/upload';
DOWNLOAD_FOLDER = "./public/download";

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
// dayjs
//
const dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc")
var timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc)
dayjs.extend(timezone);
console.log("> dayjs", dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss"));


console.log("> process.env.ENV:", process.env.ENV);
if (process.env.ENV == "prod") {
	var db_access_log = "access_log";
} else if (process.env.ENV == "nonprod-uat") {
	var db_access_log = "access_log_uat";
} else {
	var db_access_log = "access_log_dev";
}


//
// Top page
//
router.get("/", async (req, res, next) => {
	console.log("[access_logs] GET");

	query = { db: db_access_log, selector: { } }
	resp = await client.postFind(query);

	logs = {};
	docs = resp.result.docs
	docs.forEach(d => {
		if (logs[d.application] === undefined) {
			logs[d.application] = [];
		}
		
		logs[d.application].push(d);		
	});

	res.render("access_logs/index",
	{
		logs: logs
	});
});



module.exports = router;