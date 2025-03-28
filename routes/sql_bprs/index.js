//
// SQL for BPRS
//
var express = require('express');
var router = express.Router();

//
// Get data from Cloudant NoSQL DB
//
console.log("> SQL BPRS Index")

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
// axios
//
const axios = require("axios");

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

db2_server_info = {
	"qhbd": db2_str_qhbd,
	"qhcn": db2_str_qhcn,
	"qhea": db2_str_qhea,
	"qhbo": db2_str_qhbo,
}

//
// write-excel-file
// https://www.npmjs.com/package/write-excel-file
//
const writeXlsxFile = require('write-excel-file/node');


//
// Top Page 
//
router.get("/", (req, res, next) => {

	create_ts = {
		from: dayjs().subtract(90, "d").format("YYYY-MM-DD"),
		to: dayjs().format("YYYY-MM-DD"),
	}


	console.log("[sql_bprs index.js] GET");
	res.render("sql_bprs/index",
	{
		host_node: "qhbd",
		uid: "",
		pw: "",
		request_id: "",
		create_ts: create_ts,
		status: "",
		result: "",
		attachment_files: [],
		sql_result_excel: "",
		sql_result_json: "",
		user_id: curr_user_id
	});
});


//
// SQL BPRS - Clear
//
router.post("/clear", (req, res, next) => {
	console.log("[sql_bprs /clear] post");

	sql(req, res, next);
});


const sql = (req, res, next) => {

	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name + " " + req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	res.render("sql_bprs", 
	{
		host_node: "qhbd",
		uid: "",
		pw: "",
		request_id: "",
		status: "",
		result: "",
		attachment_files: [],
		sql_result_excel: "",
		sql_result_json: "",
		user_id: curr_user_id
	});
};


//
// SQL BPRS - Run
//
router.post("/run", (req, res, next) => {
	console.log("[sql_bprs /run] POST");

	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name+" "+req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	uid = req.body.userid;
	pw = req.body.password;
	create_ts = {
		from: req.body.create_ts_from + " 00:00:00",
		to: req.body.create_ts_to + " 23:59:59",
	}
	host_node = req.body.host_node;

	request_id = req.body.request_id;

	if (request_id != "") {
		sql_script = {
			sql: "select * from CH88U1.BID_REQUEST WHERE REQUEST_ID LIKE ?",
			params: [ "%" + request_id + "%" ]
		}
	} else {
		sql_script = {
			sql: "select * from CH88U1.BID_REQUEST where CREATE_TS >= ? AND CREATE_TS <= ?",
			params: [ create_ts.from, create_ts.to ]
		}
	}

	db2_str = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=" + pw + ";"
	db2_str_for_log = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=****************;"
	console.log("[index.js] db2_str:", db2_str_for_log);
	console.log("[index.js] sql_script:", sql_script);

	status = "normal_end";

	ibm_db.open(db2_str, (err, conn) => {
		if (err) {
			status = "error";
		}
		
		conn.query(sql_script, (err, data) => {
			if (err) {
				status = "error";
			}	

			console.log("[/run] Data qty:", data.length);

			if (data.length == 0) {
				result = [];
			} else {
				result = data;
			}
			
			result.forEach(r => {
				r.CREATE_TS = r.CREATE_TS.substr(0, 19);
			});
			

			conn.close(async () => {
				console.log("[/run] close ibm_db: status=", status);

				if (status == "normal_end") {
					param = {
						uid: uid,
						pw: pw,
						host_node: host_node,
						request_id: request_id,
						result: result,
						status: status,
						user_id: curr_user_id,
						create_ts: {
							from: req.body.create_ts_from,
							to: req.body.create_ts_to
						}
					}			
					
					renderSqlPage(req, res, param);
				}
			});
		});
	});
});

const renderSqlPage = (req, res, param) => {
	res.render("sql_bprs/index", param);
}


//
// SQL BPRS - Get Data from BID_REQUEST & BID_FILE
//
router.post("/get_data/:request_id", (req, res, next) => {
	console.log("[sql_bprs /get_data] POST");

	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name+" "+req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	uid = req.body.userid;
	pw = req.body.password;
	host_node = req.body.host_node;
	request_id = req.params.request_id;

	console.log("> request_id", request_id);

	db2_str = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=" + pw + ";"
	db2_str_for_log = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=****************;"

	db_columns_description = {
		BID_REQUEST: {
			// BID_REQUEST
			"REQUEST_ID": "MA BID申請書番号",
			"FACT_SHEET_ID": "FACT SHEET申請書番号",
			"APPROVAL_ID": "MA BID承認番号",
			"BID_VALIDITY_DT": "BID Validity Date",
			"ORG_REQUEST_ID": "コピー元申請番号",
			"ORG_APPROVAL_ID": "コピー元承認番号",
			"CATEGORY_CODE": "サービス分類",
			"CS_REGION_CD": "地区技術部コード",
			"CS_REGION_NM": "地区技術部",
			"CS_BRANCH_NM": "担当技術部",
			"EFFECT_ST_DATE": "適用開始日",
			"EFFECT_ED_DATE": "適用終了日",
			"TERM": "適用期間(月数)",
			"QTY_TOTAL": "Qty(合計)",
			"LIST_YEAR_TOTAL": "List Price(年間合計)",
			"LIST_TOTAL": "List Price(期間合計)",
			"LIST_TOTAL_01": "1年目のList Price合計",
			"LIST_TOTAL_02": "2年目のList Price合計",
			"LIST_TOTAL_03": "3年目のList Price合計",
			"LIST_TOTAL_04": "4年目のList Price合計",
			"LIST_TOTAL_05": "5年目のList Price合計",
			"LIST_TOTAL_06": "6年目のList Price合計",
			"LIST_TOTAL_07": "7年目のList Price合計",
			"LIST_TOTAL_08": "8年目のList Price合計",
			"LIST_TOTAL_09": "9年目のList Price合計",
			"LIST_TOTAL_10": "10年目のList Price合計",
			"RATE_YEAR_TOTAL": "割引率(D% Ave)(年間合計)",
			"RATE_TOTAL": "割引率(D% Ave)(期間合計)",
			"SBO_YEAR_TOTAL": "SBO Price(年間合計)",
			"SBO_TOTAL": "SBO Price(期間合計)",
			"SBO_TOTAL_01": "1年目のSBO Price合計",
			"SBO_TOTAL_02": "2年目のSBO Price合計",
			"SBO_TOTAL_03": "3年目のSBO Price合計",
			"SBO_TOTAL_04": "4年目のSBO Price合計",
			"SBO_TOTAL_05": "5年目のSBO Price合計",
			"SBO_TOTAL_06": "6年目のSBO Price合計",
			"SBO_TOTAL_07": "7年目のSBO Price合計",
			"SBO_TOTAL_08": "8年目のSBO Price合計",
			"SBO_TOTAL_09": "9年目のSBO Price合計",
			"SBO_TOTAL_10": "10年目のSBO Price合計",
			"COST_YEAR_TOTAL": "Cost(年間合計)",
			"COST_TOTAL": "Cost(期間合計)",
			"COST_TOTAL_01": "1年目のCost合計",
			"COST_TOTAL_02": "2年目のCost合計",
			"COST_TOTAL_03": "3年目のCost合計",
			"COST_TOTAL_04": "4年目のCost合計",
			"COST_TOTAL_05": "5年目のCost合計",
			"COST_TOTAL_06": "6年目のCost合計",
			"COST_TOTAL_07": "7年目のCost合計",
			"COST_TOTAL_08": "8年目のCost合計",
			"COST_TOTAL_09": "9年目のCost合計",
			"COST_TOTAL_10": "10年目のCost合計",
			"GP_RATE": "GP率",
			"PTI_RATE": "PTI率",
			"RBD_AMOUNT": "RBD額",
			"RBD_SBO_TOTAL": "SBO Total - RBD額",
			"RBD_GP_RATE": "RBD適用時 GP%",
			"RBD_PTI_RATE": "RBD適用時 PTI%",
			"COST_CHANGE_TXT": "Cost変更理由",
			"CONDITION_TXT": "承認条件",
			"CREATE_ID": "作成者ID",
			"CREATE_TS": "作成日",
			"UPDATE_ID ": "更新者ID",
			"UPDATE_TS": "更新日",
		},
		BID_REQUEST_BP: {
			"REQUEST_ID": "MA BID申請書番号",
			"PARTNER_REQ_ID": "パートナー記入欄",
			"PARTNER_REMARK": "パートナー備考",
			"PRICE_4_BP2": "二次店向け金額（年間合計）",
			"PRICE_4_BP2_RATE": "二次店向けＤ％",
			"PRICE_4_CUSTOMER": "お客様向け金額（年間合計）",
			"PRICE_4_CUSTOMER_RATE": "お客様向けＤ％",
			"RED_FLAG": "RedFlag",
			"SALEX_FLAG": "商流例外適用フラグ",
			"SALEX_APPROVED": "商流例外承認完了フラグ",
			"SALEX_CONDITION_TXT": "商流例外承認条件",
			"BP_CONDITION_TXT": "承認条件特則",
			"CREATE_ID": "作成者ID",
			"CREATE_TS": "作成日",
			"UPDATE_ID": "更新者ID",
			"UPDATE_TS": "更新日",
		},
		BID_FACT_SHEET: {
			// BID_FACT_SHEET
			"FACT_SHEET_ID": "FACT SHEET申請書番号",	// 重複
			"USER_ID": "申請者Intranet ID",
			"USER_NM": "申請者名",
			"TEL": "申請者電話番号",
			"USER_DEPT_KJ": "所属組織名",
			"SALES_ID": "担当営業-担当者Intranet ID",
			"SALES_NM": "担当営業-担当者名",
			"SALES_TEL": "担当営業-電話番号",
			"SALES_DEPT_NM": "担当営業-営業部",
			"SALES_SECTOR": "担当営業-セクター",
			"CONTACT_NM": "緊急連絡先-担当者名",
			"CONTACT_TEL": "緊急連絡先-電話番号",
			"BP_BID_FLAG": "案件フラグ",
			"BP_NO": "D#",
			"BP_NM": "BP名",
			"CONTRACT_CUST_NO": "契約先代表お客様番号",
			"INSTALL_CUST_NO": "インストール先お客様番号",
			"CUST_NM": "お客様名--顧客会社正式名称",
			"CUST_ADDR": "主な機器の設置先住所:顧客住所+顧客建物",
			"CSBO": "CSBO",
			"REASON_TXT": "申請理由",
			"COST_ADJUST_TXT": "Cost Avoidance by Service Level Adjust",
			"CREATE_ID": "作成者ID",	// 重複
			"CREATE_TS": "作成日",		// 重複
			"UPDATE_ID ": "更新者ID",	// 重複
			"UPDATE_TS": "更新日",		// 重複
			"BP_REQUEST_FLAG": "BP申請フラグ",
			"BP_DISPTXT_CD": "BP責任記述コード",
			"BP2_NO": "二次店BP番号",
			"BP2_NM": "二次店BP名",
			"CEID": "一次店CEID",
			"CEID2": "二次店CEID",
		},
		BID_PROCESS: {	
			// BID_PROCESS
			"REQUEST_ID" : "申請書番号",
			"PROCESS_ID" : "プロセスID",
			"STATE" : "申請ステータス区分",
			"REQUEST_STATUS" : "申請書ステータス",
			"CREATE_DATE" : "作成日時",
			"UPDATE_DATE" : "更新日時",
			"CREATE_USER": "作成者",
			"UPDATE_USER": "更新者",
			"SPCASE_APRV_ADDR" : "特定承認者のメール送付先",
			"STATUS_DETAIL": "ステータス詳細",
		},
		BID_PARAM_CTRL: {
			// BID_PARAM_CTRL
			"CATEGORY": "カテゴリー",
			"KEY": "キー",
			"VALUE": "数値",
			"LITERAL": "文言",
			"CREATE_ID": "作成者ID",	// 重複
			"CREATE_TS": "作成日",	// 重複
			"UPDATE_ID": "更新者ID",
			"UPDATE_TS": "更新日",
		},
		BID_ITEM_SUMMARY: {
			"REQUEST_ID": "申請書番号",
			"SEQ_NO": "レコード番号",
			"MACHINE_TYPE": "MTM(Machine Type)",
			"MACHINE_MODEL": "MTM(Machine Model)",
			"EFFECT_ST_DATE": "適用開始日",
			"EFFECT_ED_DATE": "適用終了日",
			"TERM": "適用期間（月数）",
			"SERVICE_CODE": "対象サービス",
			"EXTEND_FLAG": "保守延長フラグ",
			"RESPONSE_TIME": "サービス時間帯",
			"CHARGE_TYPE": "支払条件",
			"DETAIL_FLAG": "詳細フラグ",
			"QTY": "Qty",
			"MACHINE_STATUS": "機器状況",
			"LIST_PRICE": "List Price",
			"FIXED_PRICE": "定額フラグ",
			"DISCOUNT_RATE": "割引率（BID RATE)",
			"SBO_PRICE": "SBO Price",
			"LIST_YEAR_TOTAL": "List Price Total/Year",
			"LIST_TOTAL": "List Price Total",
			"LIST_TOTAL_01": "1年目のList Price合計",
			"LIST_TOTAL_02": "2年目のList Price合計",
			"LIST_TOTAL_03": "3年目のList Price合計",
			"LIST_TOTAL_04": "4年目のList Price合計",
			"LIST_TOTAL_05": "5年目のList Price合計",
			"LIST_TOTAL_06": "6年目のList Price合計",
			"LIST_TOTAL_07": "7年目のList Price合計",
			"LIST_TOTAL_08": "8年目のList Price合計",
			"LIST_TOTAL_09": "9年目のList Price合計",
			"LIST_TOTAL_10": "10年目のList Price合計",
			"SBO_YEAR_TOTAL": "SBO Price Total/Year",
			"SBO_TOTAL": "SBO Price Total",
			"SBO_TOTAL_01": "1年目のSBO Price合計",
			"SBO_TOTAL_02": "2年目のSBO Price合計",
			"SBO_TOTAL_03": "3年目のSBO Price合計",
			"SBO_TOTAL_04": "4年目のSBO Price合計",
			"SBO_TOTAL_05": "5年目のSBO Price合計",
			"SBO_TOTAL_06": "6年目のSBO Price合計",
			"SBO_TOTAL_07": "7年目のSBO Price合計",
			"SBO_TOTAL_08": "8年目のSBO Price合計",
			"SBO_TOTAL_09": "9年目のSBO Price合計",
			"SBO_TOTAL_10": "10年目のSBO Price合計",
			"COST_TYPE_A": "コスト分類",
			"COST_RATE_A": "コスト割引率",
			"COST_TYPE_B": "コスト分類",
			"COST_RATE_B": "コスト割引率",
			"COST_YEAR_TOTAL": "Cost Total/Year",
			"COST_TOTAL": "Cost Total",
			"COST_TOTAL_01": "1年目のCost合計",
			"COST_TOTAL_02": "2年目のCost合計",
			"COST_TOTAL_03": "3年目のCost合計",
			"COST_TOTAL_04": "4年目のCost合計",
			"COST_TOTAL_05": "5年目のCost合計",
			"COST_TOTAL_06": "6年目のCost合計",
			"COST_TOTAL_07": "7年目のCost合計",
			"COST_TOTAL_08": "8年目のCost合計",
			"COST_TOTAL_09": "9年目のCost合計",
			"COST_TOTAL_10": "10年目のCost合計",
			"GP_RATE": "GP率",
			"CREATE_ID": "作成者ID",
			"CREATE_TS": "作成日",
			"UPDATE_ID": "更新者ID",
			"UPDATE_TS": "更新日",
		},
		BID_ITEM_DETAIL: {
			"REQUEST_ID": "申請書番号",
			"SEQ_NO": "レコード番号",
			"SERIAL": "シリアル番号",
			"CREATE_ID": "作成者ID",
			"CREATE_TS": "作成日",
			"UPDATE_ID": "更新者ID",
			"UPDATE_TS": "更新日",
		}
	}

	//
	// SQLs
	// - 参考 : MabidRequestDaoImpl.java
	// - 作り込む時はカラムをTable名 + "." + カラム名に変更する
	//
	keys = {};
	keys.BID_REQUEST = Object.keys(db_columns_description.BID_REQUEST);
	keys.BID_REQUEST_BP = Object.keys(db_columns_description.BID_REQUEST_BP);
	keys.BID_FACT_SHEET = Object.keys(db_columns_description.BID_FACT_SHEET);
	keys.BID_PROCESS = Object.keys(db_columns_description.BID_PROCESS);
	keys.BID_PARAM_CTRL = Object.keys(db_columns_description.BID_PARAM_CTRL);
	keys.BID_ITEM_SUMMARY = Object.keys(db_columns_description.BID_ITEM_SUMMARY);
	keys.BID_ITEM_DETAIL = Object.keys(db_columns_description.BID_ITEM_DETAIL);

	sql_text = "select" + " ";
	keys.BID_REQUEST.forEach(k => { 
		sql_text += "CH88U1.BID_REQUEST." + k + " AS " + "BR__" + k + "," 
	});
//	keys.BID_REQUEST_BP.forEach(k => { 
//		sql_text += "CH88U1.BID_REQUEST_BP." + k + " AS " + "BRBP__" + k + "," 
//	});
	keys.BID_FACT_SHEET.forEach(k => { 
		sql_text += "CH88U1.BID_FACT_SHEET." + k + " AS " + "BFS__" + k + "," 
	});
	keys.BID_PROCESS.forEach(k => { 
		sql_text += "CH88U1.BID_PROCESS." + k + " AS " + "BP__" + k + "," 
	});
	keys.BID_PARAM_CTRL.forEach(k => { 
		sql_text += "CH88U1.BID_PARAM_CTRL." + k + " AS " + "BPC__" + k + "," 
	});
	sql_text = sql_text.slice(0, -1);
	sql_text += " ";

	sql_text += "FROM CH88U1.BID_REQUEST, CH88U1.BID_PROCESS, CH88U1.BID_PARAM_CTRL, CH88U1.BID_FACT_SHEET" + " ";
//	sql_text += "FROM CH88U1.BID_REQUEST, CH88U1.BID_PROCESS, CH88U1.BID_PARAM_CTRL, CH88U1.BID_FACT_SHEET, CH88U1.BID_REQUEST_BP" + " ";
	sql_text += "WHERE CH88U1.BID_REQUEST.FACT_SHEET_ID = CH88U1.BID_FACT_SHEET.FACT_SHEET_ID" + " ";
	sql_text += "AND CH88U1.BID_REQUEST.REQUEST_ID = CH88U1.BID_PROCESS.REQUEST_ID" + " ";
	sql_text += "AND CH88U1.BID_REQUEST.REQUEST_ID = ?" + " ";
	sql_text += "AND CHAR(CH88U1.BID_PROCESS.REQUEST_STATUS) = CH88U1.BID_PARAM_CTRL.KEY" + " ";
	sql_text += "AND CH88U1.BID_PARAM_CTRL.CATEGORY = 'PROCESS_STATUS'" + " ";

	sql_script = {
		sql: sql_text,
		params: [ request_id ]
	}

	//
	// SQL for BID_FILE
	//
	sql_script_file = {
		sql: "select id, file_nm, file_size, file_content, CREATE_TS from CH88U1.BID_FILE where id = ?",
		params: [ request_id ]
	}

	//
	// SQL for BID_ITEM_SUMMARY
	// 
	sql_text = "select" + " ";
	keys.BID_ITEM_SUMMARY.forEach(k => { 
		sql_text += "CH88U1.BID_ITEM_SUMMARY." + k + " AS " + "BIS__" + k + "," 
	});
	keys.BID_ITEM_DETAIL.forEach(k => { 
		sql_text += "CH88U1.BID_ITEM_DETAIL." + k + " AS " + "BID__" + k + "," 
	});
	sql_text = sql_text.slice(0, -1);
	sql_text += " ";
	sql_text += "from CH88U1.BID_ITEM_SUMMARY, CH88U1.BID_ITEM_DETAIL where CH88U1.BID_ITEM_SUMMARY.REQUEST_ID = ? and CH88U1.BID_ITEM_SUMMARY.REQUEST_ID = CH88U1.BID_ITEM_DETAIL.REQUEST_ID"

	sql_script_item = {
		sql: sql_text,
		params: [ request_id ]
	}

	console.log("[index.js] db2_str:", db2_str_for_log);
	console.log("[index.js] sql_script:", sql_script);
	console.log("[index.js] sql_script_file:", sql_script_file);
	console.log("[index.js] sql_script_item:", sql_script_item);

	status = "normal_end";

	//
	// BID_REQUEST
	//
	ibm_db.open(db2_str, (err, conn) => {
		if (err) {
			status = "error";
		}
		
		time = {}
		//
		// (1) SQL SELECT
		//
		time.request_data = {};
		time.request_data.start = dayjs();
			
		conn.query(sql_script, (err, data) => {
			if (err) {
				status = "error";
			}	

			console.log("[/get_data] Data qty:", data.length);

			if (data.length == 0) {
				result = [];
			} else {
				result = data;
			}

			result_request = [];
			if ((result != undefined) && (result.length != 0)) {
				keys = Object.keys(result[0]);

				keys_list = [];
				keys.forEach(k => {
					keys_list.push(
						{ type: String, value: k }
					);
				});

				data = {};
				keys.forEach(k => {
					column_name = k.replace("__", ".").split(".")
					
					if (column_name[0] == "BR") {
						column_name[0] = "BID_REQUEST";
//					} else if (column_name[0] == "BRBP") {
//						column_name[0] = "BID_REQUEST_BP";
					} else if (column_name[0] == "BFS") {
						column_name[0] = "BID_FACT_SHEET";
					} else if (column_name[0] == "BP") {
						column_name[0] = "BID_PROCESS";
					} else if (column_name[0] == "BPC") {
						column_name[0] = "BID_PARAM_CTRL";
					}
					
					data = {
					//	column_name: k,
					//	description: db_columns_description[k],
						table_name: column_name[0],
						column_name: column_name[1],
						description: db_columns_description[column_name[0]][column_name[1]],
						data: result[0][k]
					}
					result_request.push(data);
				});
			}
			
		//	console.log("> result_request.length:", result_request.length);

			time.request_data.end = dayjs();
			time.attachment_file_download = {};
			time.attachment_file_download.start = dayjs();
		});


		//
		// (2) BID_FILE & ファイルの復元
		//
		conn.query(sql_script_file, (err, data) => {
			console.log("[/get_data] BID_FILE - Data qty:", data.length);

			if (data.length == 0) {
				result_file = [];
			} else {
				result_file = data;
			}

			time.attachment_file_download.end = dayjs();
			time.attachment_file_convert = {};
			time.attachment_file_convert.start = dayjs();

			
			//
			// BPRSの添付ファイル復元
			//
			// Sample SQL : select id, file_nm, file_size, file_content, CREATE_TS from CH88U1.BID_FILE where id = 'M23050040'
			//
			attachment_files = [];

			for (i = 0; i < result_file.length; i++) {
				attachment_files[i] = result_file[i].FILE_NM;
				fs.writeFile(download_folder + "/" + result_file[i].FILE_NM, result_file[i].FILE_CONTENT, (err) => {
					if (err) throw err;
					console.log("> Write file") ;
				});
			}
			time.attachment_file_convert.end = dayjs();
			time.item = {};
			time.item.start = dayjs();
		});


		//
		// (3) BID_ITEM_SUMMARY & DETAIL
		//
		conn.query(sql_script_item, (err, data) => {
			console.log("[/get_data] BID_ITEM_SUMMARY - Data qty:", data.length);

			if (data.length == 0) {
				result = [];
			} else {
				result = data;
			}


			result_item = [];
			if ((result != undefined) && (result.length != 0)) {
				keys = Object.keys(result[0]);

				keys_list = [];
				keys.forEach(k => {
					keys_list.push(
						{ type: String, value: k }
					);
				});

				data = {};
				keys.forEach(k => {
					column_name = k.replace("__", ".").split(".")
					
					if (column_name[0] == "BIS") {
						column_name[0] = "BID_ITEM_SUMMARY";
					} else if (column_name[0] == "BID") {
						column_name[0] = "BID_ITEM_DETAIL";
					}

					data = {
						table_name: column_name[0],
						column_name: column_name[1],
						description: db_columns_description[column_name[0]][column_name[1]],
						data: result[0][k]
					}
					result_item.push(data);
				});
			}
			
			console.log("> BID_ITEM_SUMMARY", result_item);

			time.item.end = dayjs();
		});


		conn.close(async () => {
			console.log("[/get_data] close ibm_db: status=", status);

			time.elapsed_time = {};
			time.elapsed_time.request_data = time.request_data.end.diff(time.request_data.start) / 1000;
			time.elapsed_time.attachment_file_download = time.attachment_file_download.end.diff(time.attachment_file_download.start) / 1000;
			time.elapsed_time.attachment_file_convert = time.attachment_file_convert.end.diff(time.attachment_file_convert.start) / 1000;
			time.elapsed_time.item = time.item.end.diff(time.item.start) / 1000;
			console.log("> time", time);

			if (status == "normal_end") {
				param = {
					uid: uid,
					pw: pw,
					request_id: request_id,
					host_node: host_node,
					status: status,
					result_request: result_request,
					result_file: result_file,
					result_item: result_item,
					attachment_files: attachment_files,
//					sql_result_excel: excel_sql_result_excel,
//					sql_result_json: sql_result_json,
					user_id: curr_user_id,
					time: time
				}			
				
				renderResultPage(req, res, param);
			}
		});
	});
});

const renderResultPage = (req, res, param) => {
//	console.log("> param", param);
	res.render("sql_bprs/result", param);
}


//
// User Access Analysis
//
//
// Top Page 
//
router.get("/user_analysis", (req, res, next) => {
	console.log("[sql_bprs index.js/user_analysis] GET");

	create_ts = {
		from: dayjs().subtract(12, "M").format("YYYY-MM-DD"),
		to: dayjs().format("YYYY-MM-DD"),
	}

	res.render("sql_bprs/user_analysis",
	{
		host_node: "qhbd",
		uid: "",
		pw: "",
		result: "",
		status: "",
		user_summary: "",
		user_id: curr_user_id,
		access_time: create_ts,
	});
});


//
// SQL BPRS - User Analysis Run
//
router.post("/user_analysis_run", (req, res, next) => {
	console.log("[sql_bprs /user_analysis_run] POST");

	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name+" " + req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	uid = req.body.userid;
	pw = req.body.password;
	access_time = {
		from: req.body.access_time_from + " 00:00:00",
		to: req.body.access_time_to + " 23:59:59",
	}
	host_node = req.body.host_node;

	request_id = req.body.request_id;

	sql_script = {
		sql: "select * from CH88U1.ACCESS_LOG where ACCESS_TIME >= ? AND ACCESS_TIME <= ?",
		params: [ access_time.from, access_time.to ]
	}

	db2_str = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=" + pw + ";"
	db2_str_for_log = db2_server_info[host_node] + "UID=" + uid + ";" + "PWD=****************;"
	console.log("[index.js] db2_str:", db2_str_for_log);
	console.log("[index.js] sql_script:", sql_script);

	status = "normal_end";

	ROLES = {
		MA0: "アセッサー",
		MA1: "商流例外承認者",
		MA2: "HQレベル承認者（IOTレベル同意者）",
		MA6: "法務承認者",
		MB1: "BPO担当者",
		MD1: "Market Delivery Leader",
		MD9: "Pricer",
		MI1: "業務ユーザー",
		MO1: "AO担当者",
		MR1: "BID申請者",
		MR2: "BID申請者（全申請）",
		MZ1: "Market Delivery Leader承認者",
		MZ2: "TSOL承認者",
		MZ3: "???承認者",
		MZ4: "MVS Level 2承認者",
		MZ6: "Logo Level 1承認者",
		MZ7: "ダミーIBM承認者",
	}

	ibm_db.open(db2_str, (err, conn) => {
		if (err) {
			status = "error";
		}
		
		conn.query(sql_script, async (err, data) => {
			if (err) {
				status = "error";
			}	

			console.log("[/run] Data qty:", data.length);

			if (data.length == 0) {
				result = [];
			} else {
				result = data;
			}
			
			user_summary_raw = {};
			
			result.forEach(r => {
				r.ACCESS_TIME = r.ACCESS_TIME.substr(0, 19);
				
				if (user_summary_raw[r.USER_ID.trim()] == undefined) {
					user_summary_raw[r.USER_ID.trim()] = {
						count: 0,
						role: r.ACCESS_KEY.slice(-9, -6),
						role_name: ROLES[r.ACCESS_KEY.slice(-9, -6)]
					}
				}
				user_summary_raw[r.USER_ID.trim()].count += 1;
			});
			
			keys = Object.keys(user_summary_raw);

			// Bluepage info
			BP_URL = "https://w3-unifiedprofile-api.dal1a.cirrus.ibm.com/v3/profiles/"
			let u_keys = ""
			keys.forEach(k => {
				u_keys += k + ",";
			});
			u_keys = u_keys.slice(0, -1)

			const response = await axios.get(BP_URL + u_keys);
			bp_data_result = response.data.profiles;

			bp_data_result.forEach(d => {
				/*
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
				*/
				
				user_summary_raw[d.content.mail[0]].uid = d.content.uid;
				user_summary_raw[d.content.mail[0]].preferredIdentity = d.content.preferredIdentity;
				user_summary_raw[d.content.mail[0]].nameDisplay = d.content.nameDisplay;
				user_summary_raw[d.content.mail[0]].costCenter = d.content.costCenter;
				user_summary_raw[d.content.mail[0]].co = d.content.co;
				user_summary_raw[d.content.mail[0]].functionalManager = d.content.functionalManager;
			});

			user_summary = [];
			keys.forEach(k => {
				data = {
					user_id: k,
					count: user_summary_raw[k].count,
					role: user_summary_raw[k].role,
					role_name: user_summary_raw[k].role_name,
					uid: user_summary_raw[k].uid,
					preferredIdentity: user_summary_raw[k].preferredIdentity,
					nameDisplay: user_summary_raw[k].nameDisplay,
					costCenter: user_summary_raw[k].costCenter,
					co: user_summary_raw[k].co,
					functionalManager: user_summary_raw[k].functionalManager,
				}
				user_summary.push(data);
			});


			user_summary.sort((a, b) => {
				if (a.count > b.count) { return 1 }
				if (a.user_id > b.user_id) { return 1 }
			});			
			
		//	console.log("> status:", status)
		//	console.log("> result:", result);
			console.log("> user_summary", user_summary);

			conn.close(async () => {
				console.log("[/user_analysis_run] close ibm_db: status=", status);

				if (status == "normal_end") {
					param = {
						host_node: "qhbd",
						uid: uid,
						pw: pw,
						result: result,
						status: status,
						user_summary: user_summary,
						user_id: curr_user_id,
						access_time: {
							from: req.body.access_time_from,
							to: req.body.access_time_to
						}
					}			
					
					renderSqlPage_user_analysis(req, res, param);
				}
			});
		});
	});
});

const renderSqlPage_user_analysis = (req, res, param) => {
	res.render("sql_bprs/user_analysis", param);
}



module.exports = router;