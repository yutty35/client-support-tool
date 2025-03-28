//
// SQL
//
var express = require('express');
var router = express.Router();

//
// Get data from Cloudant NoSQL DB
//
console.log("> SQL Index")

console.log("> (process.env.ENV", process.env.ENV)
var fs = require('fs').promises;

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
// IBM db2

// 注意 : ibm_dbがApple Siliconをサポートしていないため、M1 MacのLocalではエラーになる。Cirrus上で動作確認が必要。
//
//if (process.env.ENV != "local") { // 上記理由によりLocalではsql機能は動作しない
var ibm_db = require('ibm_db');
//}
process.env.DB2CODEPAGE = 1208; // 文字化け対応

//
// MF DB2 
//
var db2_str_qhbd = "DATABASE=QHBDDB01;"
				+ "HOSTNAME=g40db2cl002.ash.cpc.ibm.com;" // QHBD1
//				+ "HOSTNAME=g40db2cl001.ash.cpc.ibm.com;" // QHBD2
				+ "PORT=50000;"
				+ "PROTOCOL=TCPIP;"

var db2_str_qhcn = "DATABASE=QHCNASSL;"
				+ "HOSTNAME=g40db2cl001.ash.cpc.ibm.com;"
				+ "PORT=50000;"
				+ "PROTOCOL=TCPIP;"

var db2_str_qhea = "DATABASE=QHEADB0A;"
				+ "HOSTNAME=g40db2cl001.ash.cpc.ibm.com;"
				+ "PORT=50000;"
				+ "PROTOCOL=TCPIP;"
				
var db2_str_qhbo = "DATABASE=QHBO1SSL;"
				+ "HOSTNAME=g40db2cl002.ash.cpc.ibm.com;"
				+ "PORT=50001;"
				+ "PROTOCOL=TCPIP;"
				
//
// BAIW : https://w3.ibm.com/w3publisher/tls-global-data/faq
//
// https://w3.ibm.com/w3publisher/tss-global-reporting/help-faq
//

// As of April 2022, BAIW is now in the IBM CIO Public Cloud
// 
//		Hostname: db2w-rjnssfl.us-south.db2w.cloud.ibm.com
//		Port: 50001
//		Database: BLUDB
//		Protocol: TCPIP
//		Security: SSL
//		JDBC URL: jdbc:db2://db2w-rjnssfl.us-south.db2w.cloud.ibm.com:50001/BLUDBsslConnection=true
//
//
// SELECT * FROM STATS_CHISAP.DBPBDWR_WCHTASB
// select * from RAW_OL.OPP_DETAILS_EOS
//
var db2_str_baiw = "DATABASE=BLUDB;"
				+ "HOSTNAME=db2w-rjnssfl.us-south.db2w.cloud.ibm.com;"
				+ "PORT=50001;"
				+ "PROTOCOL=TCPIP;"
				+ "BLUDBsslConnection=true;"
				+ "Security=SSL;"
				+ "sslConnection=true;"
//				+ "sslCertLocation='/public/baiw_db2_certification/DigiCertGlobalRootCA.crt'"


var db2_str_temp = "DATABASE=BNLDSNL1;"
				+ "HOSTNAME=gmebi3.vipa.uk.ibm.com;"
				+ "PORT=447;"
				+ "PROTOCOL=TCPIP;"
				+ "BLUDBsslConnection=true;"
				+ "Security=SSL;"
				+ "sslConnection=true;"


db2_server_info = {
	"qhbd": db2_str_qhbd,
	"qhcn": db2_str_qhcn,
	"qhea": db2_str_qhea,
	"qhbo": db2_str_qhbo,
	"baiw": db2_str_baiw,
	"temp": db2_str_temp
	}

//
// write-excel-file
// https://www.npmjs.com/package/write-excel-file
//
const writeXlsxFile = require('write-excel-file/node');

//
// 現在の日時の取得
//
var getCurrentTime = (mm) => {
    var date = new Date();
   	date.setMonth(date.getMonth() + mm);

//    if (env == "host") {
    	date.setHours(date.getHours() + 9);
//   	} else if (env == "local") {
//   		date.setHours(date.getHours());
//    }

    var d = date.getFullYear() + '-';
    d += ('0' + (date.getMonth() + 1)).slice(-2) + '-';
	d += ('0' + date.getDate()).slice(-2) + 'T';
	d += ('0' + date.getHours()).slice(-2) + ':';
	d += ('0' + date.getMinutes()).slice(-2) + ':';
	d += ('0' + date.getSeconds()).slice(-2) + 'Z';

	return d;
};


//
// Top Page 
//
router.get("/", (req, res, next) => {

	console.log("[index.js] GET");
	res.render("sql/index",
	{
	});
});


//
// CH86 DMaS: User Table SQL
//
router.get("/sql_ch86user", (req, res, next) => {

	console.log("[index.js] GET");
	console.log("[index.js] req.query :", req.query);
	console.log("[index.js] Render page: /");
	res.render("sql/sql_ch86user",
	{
		uid: "",
		pw: "",
		db_table: "",
		result_qty: "",
		result_html: "",
		file_name: ""
	});
});


//
// CH86 DMaS: User Table SQL - Clear
//
router.post("/sql_ch86user/clear", (req, res, next) => {

	console.log("[index.js] POST");
	
	res.render("sql/sql_ch86user",
	{
		uid: "",
		pw: "",
		db_table: "",
		result_qty: "",
		result_html: "",
		file_name: ""
	});
});


//
// CH86 DMaS: User Table SQL
//
router.post("/sql/:query_name", (req, res, next) => {

	console.log("[index.js/sql] POST");

	console.log("* query:", req.query);
	console.log("* body:", req.body);
	
	uid = req.body.userid;
	pw = req.body.password;

	query_name = req.params.query_name;
	console.log("* param:", query_name);

	host_node = "qhbd";
	db2_str = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=" + pw + ";"
	db2_str_for_log = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=****************;"
	console.log("[index.js] db2_str:", db2_str_for_log);

	var db_table = "";
	var sql = "";

	switch (query_name) {
		case "user_list":
			db_table = "ch86u1.ch86user";
			sql = "select * from " + db_table + " order by LASTUPDATE_DATE desc";
			break;
		case "user_history":
			db_table = "ch86u1.ch86user_hist";
			sql = "select * from " + db_table + " order by LASTUPDATE_DATE desc";
			break;
		case "access_log":
			db_table = "ch86u1.ch86tlog";
			sql = "select * from " + db_table + " where (( access_time >= year(add_months(sysdate,-3)) || '-' || month(add_months(sysdate,-3)) || '-01'  )) order by 2 asc"
			break;
	};
	console.log("> SQL", sql);

	ibm_db.open(db2_str, function(err, conn) {
		if(err) {
			//return console.log(err);
			
			console.log("[index.js] SQL Error");
			res.render("index", 
			{
				uid: uid,
				pw: pw,
				db_table: db_table.toUpperCase(),
				result_qty: "",
				result_html: err,
				file_name: ""
			});			
		} else {
			console.log("[index.js] sql:", sql);

			switch (db_table) {
				case "ch86u1.ch86user":
					var result_csv = "ID,ROLE,CATEGORY,MABO,CREATE_DATE,LASTUPDATE_DATE,UPDATE_USER\n";
					var result_html = "<tr>\n<th>ID</th><th>ROLE</th><th>CATEGORY</th><th>MABO</th><th>CREATE_DATE</th><th>LASTUPDATE_DATE</	th><th>UPDATE_USER</th>\n"
					break;
				case "ch86u1.ch86user_hist":
					var result_csv = "HISTTYPE,RHISTDATE,HISTID,ID,ROLE,CATEGORY,MABO,CREATE_DATE,LASTUPDATE_DATE,UPDATE_USER\n";
					var result_html = "<tr>\n<th>HISTTYPE</th><th>HISTDATE</th><th>HISTID</th><th>ID</th><th>ROLE</th><th>CATEGORY</th><th>MABO</th><th>CREATE_DATE</th><th>LASTUPDATE_DATE</	th><th>UPDATE_USER</th>\n"
					break;
				case "ch86u1.ch86tlog":
					var result_csv = "USER_ID,ACCESS_TIME,ACCESS_ROLE,RESULT\n";
					var result_html = "<tr>\n<th>USER_ID</th><th>ACCESS_TIME</th><th>ACCESS_ROLE</th><th>RESULT</th>\n"
					break;
			}

			var result_qty = 0;
			conn.query(sql, function(err, data) {
				if (err) {
					console.log("[index.js] ERROR");
				} else {
					// console.log(data);
					console.log("[index.js] Data qty:", data.length);
					result_qty = data.length;

					excel_data = [];

					for (i = 0; i < data.length; i++) {
						switch (db_table) {
							case "ch86u1.ch86user":
								if (i == 0) {
									excel_data.push([
										{ type: String, value: "ID" },
										{ type: String, value: "ROLE" },
										{ type: String, value: "CATEGORY" },
										{ type: String, value: "MABO" },
										{ type: String, value: "CREATE_DATE" },
										{ type: String, value: "LASTUPDATE_DATE" },
										{ type: String, value: "UPDATE_USER" }
									]);
								}

								excel_data.push([
									{ type: String, value: data[i].ID },
									{ type: String, value: data[i].ROLE },
									{ type: String, value: data[i].CATEGORY },
									{ type: String, value: data[i].MABO },
									{ type: String, value: data[i].CREATE_DATE },
									{ type: String, value: data[i].LASTUPDATE_DATE },
									{ type: String, value: data[i].UPDATE_USER }
								]);
								
								result_html += "<tr>" 
											+ "<td nowrap>" + data[i].ID + "</td>"
											+ "<td nowrap>" + data[i].ROLE + "</td>" 
											+ "<td nowrap>" + data[i].CATEGORY + "</td>" 
											+ "<td nowrap>" + data[i].MABO + "</td>" 
											+ "<td nowrap>" + data[i].CREATE_DATE + "</td>" 
											+ "<td nowrap>" + data[i].LASTUPDATE_DATE + "</td>" 
											+ "<td nowrap>" + data[i].UPDATE_USER + "</td>\n</tr>\n";
								break;
							case "ch86u1.ch86user_hist":
								if (i == 0) {
									excel_data.push([
										{ type: String, value: "HISTTYPE" },
										{ type: String, value: "HISTDATE" },
										{ type: String, value: "HISTID" },
										{ type: String, value: "ID" },
										{ type: String, value: "ROLE" },
										{ type: String, value: "CATEGORY" },
										{ type: String, value: "MABO" },
										{ type: String, value: "CREATE_DATE" },
										{ type: String, value: "LASTUPDATE_DATE" },
										{ type: String, value: "UPDATE_USER" }
									]);
								}

								excel_data.push([
									{ type: String, value: data[i].HISTTYPE },
									{ type: String, value: data[i].HISTDATE },
									{ type: String, value: data[i].HISTID },
									{ type: String, value: data[i].ID },
									{ type: String, value: data[i].ROLE },
									{ type: String, value: data[i].CATEGORY },
									{ type: String, value: data[i].MABO },
									{ type: String, value: data[i].CREATE_DATE },
									{ type: String, value: data[i].LASTUPDATE_DATE },
									{ type: String, value: data[i].UPDATE_USER }
								]);

								result_html += "<tr>" 
											+ "<td nowrap>" + data[i].HISTTYPE + "</td>"
											+ "<td nowrap>" + data[i].HISTDATE + "</td>" 
											+ "<td nowrap>" + data[i].HISTID + "</td>" 
											+ "<td nowrap>" + data[i].ID + "</td>" 
											+ "<td nowrap>" + data[i].ROLE + "</td>" 
											+ "<td nowrap>" + data[i].CATEGIRY + "</td>" 
											+ "<td nowrap>" + data[i].MABO + "</td>" 
											+ "<td nowrap>" + data[i].CREATE_DATE + "</td>" 
											+ "<td nowrap>" + data[i].LASTUPDATE_DATE + "</td>" 
											+ "<td nowrap>" + data[i].UPDATE_USER + "</td>\n</tr>\n";
								break;
							case "ch86u1.ch86tlog":
								if (i == 0) {
									excel_data.push([
										{ type: String, value: "USER_ID" },
										{ type: String, value: "ACCESS_TIME" },
										{ type: String, value: "ACCESS_ROLE" },
										{ type: String, value: "RESULT" }
									]);
								}

								excel_data.push([
									{ type: String, value: data[i].USER_ID },
									{ type: String, value: data[i].ACCESS_TIME },
									{ type: String, value: data[i].ACCESS_ROLE },
									{ type: String, value: data[i].RESULT }
								]);

								result_html += "<tr>" 
											+ "<td nowrap>" + data[i].USER_ID + "</td>" 
											+ "<td nowrap>" + data[i].ACCESS_TIME + "</td>" 
											+ "<td nowrap>" + data[i].ACCESS_ROLE + "</td>" 
											+ "<td nowrap>" + data[i].RESULT + "</td>\n</tr>\n";
								break;
						}
					}
				}
			});

			
			conn.close(function(){
				var c_time = getCurrentTime(0);
				dt = c_time.substr(0,4) + c_time.substr(5,2) + c_time.substr(8,2) + c_time.substr(11,2) + c_time.substr(14,2) + c_time.substr(17,2);

				excel_file_name = "sql_result_" + dt + ".xlsx";
			
				writeXlsxFile(excel_data, {
				//	columns, // (optional) column widths, etc.
					headerStyle: {
						color: "#FFFFFF",
						backgroundColor: '#4F68DC',
						fontWeight: 'bold',
						align: 'center'
					},
					sheet: "SQL Result",
					filePath: download_folder + "/" + excel_file_name
				});


				res.render("sql/sql_ch86user", 
				{
					uid: uid,
					pw: pw,
					db_table: db_table.toUpperCase(),
					result_qty: result_qty,
					result_html: result_html,
					file_name: excel_file_name
				});
			});
		}
	});
});


//
// Custom SQL
//
router.get("/sql_custom", (req, res, next) => {
	console.log("[index.js/sql_custom] POST");
	
	sql_custom(req, res, next);
});

//
// Custom SQL - Clear
//
router.post("/sql_custom/clear", (req, res, next) => {
	console.log("[index.js/sql_custom/clear] post");

	sql_custom(req, res, next);
});


const sql_custom = (req, res, next) => {

	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name+" "+req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	query = { db: db_sql_log, selector: { } }
	client.postFind(query).then(response => {
		sql_log = response.result.docs;
		sql_log.sort((a, b) => {
			if (a.timestamp > b.timestamp) { return -1 }
			if (a.timestamp < b.timestamp) { return 1 }
		});

		res.render("sql/sql_custom", 
		{
			host_node: "qhbd",
			uid: "",
			pw: "",
			sql: "",
			status: "",
			result_qty: 0,
			result: "",
			file_name: "",
			json_file_name: "",
			sql_log: sql_log,
			user_id: curr_user_id
		});
	});
};


//
// Custom SQL - Run
//
router.post("/sql_custom/run", (req, res, next) => {

	console.log("[index.js/sql_custom/run] POST");

	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name+" "+req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	uid = req.body.userid;
	pw = req.body.password;
	sql = req.body.sql;
	host_node = req.body.host_node;
	
	db2_str = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=" + pw + ";"
	db2_str_for_log = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=****************;"
	console.log("[index.js] db2_str:", db2_str_for_log);

	status = "normal_end";

	ibm_db.open(db2_str, (err, conn) => {
		if(err) {
			status = "error";
			
			console.log("[index.js/custom_sql] SQL Error");
			res.render("sql/sql_custom", 
			{
				uid: uid,
				pw: pw,
				sql: sql,
				status: status,
				result_qty: "",
				result: err,
				file_name: "",
				json_file_name: "",
				user_id: curr_user_id
			});			
		} else {
			console.log("[index.js] sql:", sql);

			var result = "";
			var result_qty = 0;
		
			conn.query(sql, (err, data) => {
				if (err) {
//					throw err;
//					result = err;
					status = "error";

					console.log("[index.js/custom_sql] Error while getting data");
					res.render("sql/sql_custom", 
					{
						uid: uid,
						pw: pw,
						sql: sql,
						status: status,
						result_qty: "",
						result: err,
						file_name: "",
						json_file_name: "",
						user_id: curr_user_id
					});		

				} else {	
					console.log("[index.js/custom_sql] Data qty:", data.length);
					result_qty = data.length;

					if (data.length == 0) {
						result = [ "NO DATA" ];
					} else {
						result = data;
					}
			
					result_excel = [];
					if ((result != undefined) && (result.length != 0)) {
						keys = Object.keys(result[0]);

						keys_list = [];
						keys.forEach(k => {
							keys_list.push(
								{ type: String, value: k }
							);
						});
						result_excel.push(keys_list);

						result.forEach(r => {
							data = [];
							keys.forEach(k => {
								data.push(
									{ type: String, value: String(r[k]) }
								);
							});
							result_excel.push(data);
						});
					}
				}

				conn.close(async () => {
					console.log("[index.js/custom_sql] close ibm_db: status=", status);
	
					if (status == "normal_end") {
						var c_time = getCurrentTime(0);
						timestamp = c_time.substr(0,4) + "-" + c_time.substr(5,2) + "-" + c_time.substr(8,2) + " " + c_time.substr(11,2) + ":" + c_time.substr(14,2) + ":" + c_time.substr(17,2);
						dt = timestamp.replace(/-/g, "").replace(/ /g, "").replace(/:/g, "");
	
						excel_file_name = "SQL_Result_" + host_node + "_" + dt + ".xlsx";
	
						// SQL ResultをJSONファイルで書き出し (データ確認用)
						var result_json = result;
						var json_file_name = "SQL_Result_" + host_node + "_" + dt + ".json";
						await fs.writeFile(download_folder + "/" + json_file_name, JSON.stringify(result_json, null, "\t"));
	
						sql_details = [
							[ { type: String, value: "TIMESTAMP" }, { type: String, value: timestamp } ],
							[ { type: String, value: "NODE" }, { type: String, value: host_node } ],
							[ { type: String, value: "SQL" }, { type: String, value: sql } ]
						]
						
						writeXlsxFile([ sql_details, result_excel ], {
							headerStyle: {
								color: "#FFFFFF",
								backgroundColor: '#4F68DC',
								fontWeight: 'bold',
								align: 'center'
							},
							sheets: [ "SQL", "SQL Result" ],
							filePath: download_folder + "/" + excel_file_name
						});	
																
						document = {
							node: host_node,
							sql: sql,
							status: status, 
							user_id: curr_user_id,
							timestamp: dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss")
						}
						
						query = { db: db_sql_log, selector: { } }
						client.postFind(query).then(response => {
							sql_log = response.result.docs;
							sql_log.sort((a, b) => {
								if (a.timestamp > b.timestamp) { return -1 }
								if (a.timestamp < b.timestamp) { return 1 }
							});
							
							duplicated = "No";
							for (i = 0; i < sql_log.length; i++) {
								if (sql_log[i].sql == sql) {
									duplicated = "Yes";
									break;
								}
							}
							console.log("> duplicated", duplicated)
							
							param = {
								uid: uid,
								pw: pw,
								sql: sql,
								host_node: host_node,
								status: status,
								result_qty: result_qty,
								result: result,
								file_name: excel_file_name,
								json_file_name: json_file_name,
								sql_log: sql_log,
								user_id: curr_user_id
							}
	
							if (duplicated == "No") {
								// 新しいSQL文
								query = { db: db_sql_log, document: document }
								client.postDocument(query).catch(error => {
									consol.log("> error:", error);
								}).then(response => {
									query = { db: db_sql_log, selector: { } }
									client.postFind(query).then(response => {
										sql_log = response.result.docs;
										sql_log.sort((a, b) => {
											if (a.timestamp > b.timestamp) { return -1 }
											if (a.timestamp < b.timestamp) { return 1 }
										});
										
										param.sql_log = sql_log;
	
										//
										// render sql/sql_custom pahge
										//
										renderSqlPage(req, res, param);
									});
								});
							} else {
								//
								// render sql/sql_custom pahge
								//
								renderSqlPage(req, res, param);
							}
						}).catch((error) => {
							console.log("[index.js/custom_sql] catch error at postFind. status=", status);
	
							param = {
								uid: uid,
								pw: pw,
								sql: sql,
								host_node: host_node,
								status: status,
								result_qty: result_qty,
								result: result,
								file_name: excel_file_name, // Error時もEXCELファイルは作成されている(はず)
								json_file_name: json_file_name,
								sql_log: sql_log,
								user_id: curr_user_id
							}
	
							//
							// render sql/sql_custom pahge
							//
							renderSqlPage(req, res, param);
						});
					} else {
						console.log("[index.js/custom_sql] Error:", result);
	
						query = { db: db_sql_log, selector: { } }
						client.postFind(query).then(response => {
							sql_log = response.result.docs;
							sql_log.sort((a, b) => {
								if (a.timestamp > b.timestamp) { return -1 }
								if (a.timestamp < b.timestamp) { return 1 }
							});
	
							param = {
								uid: uid,
								pw: pw,
								sql: sql,
								host_node: host_node,
								status: status,
								result_qty: result_qty,
								result: result,
								file_name: "", // status == "normal_end"以外はEXCELファイルはない
								json_file_name: "", // status == "normal_end"以外はJSONファイルはない
								sql_log: sql_log,
								user_id: curr_user_id
							}
	
							//
							// render sql/sql_custom pahge
							//
							renderSqlPage(req, res, param);
						}).catch((error) => {
							console.log("[index.js/custom_sql] catch error at postFind. status=", status);
	
							param = {
								uid: uid,
								pw: pw,
								sql: sql,
								host_node: host_node,
								status: status,
								result_qty: result_qty,
								result: result,
								file_name: "", // status == "normal_end"以外はEXCELファイルはない
								json_file_name: "", // status == "normal_end"以外はJSONファイルはない
								sql_log: sql_log,
								user_id: curr_user_id
							}
	
							//
							// render sql/sql_custom pahge
							//
							renderSqlPage(req, res, param);
						});
					}
				});
			});
		}
	});
});

const renderSqlPage = (req, res, param) => {
	res.render("sql/sql_custom", param);
}

module.exports = router;