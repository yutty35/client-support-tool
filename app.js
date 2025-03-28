/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

//
// .env for local
//
require('dotenv').config();


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var path = require('path');

//Set session expire time
console.log("> COOKIE_SECRET", process.env.COOKIE_SECRET);
app.use(require('express-session')({
//	secret: 'keyboard cat',
	secret: process.env.COOKIE_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 4320 * 60 * 1000  //4320 min(3days)
	}
}));
var cookieParser = require('cookie-parser');

//Get POST parameter.Set body-parser(Required from express4)
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended: false,
	parameterLimit: 10000,
	limit: 1024 * 1024 * 10
}));
/*
app.use(bodyParser.json({
	extended: false,
	parameterLimit: 10000,
	limit: 1024 * 1024 * 10
}));
*/

// set ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

//Redirect from http to https
/*
function requireHTTPS(req, res, next) {
	if (req.headers && req.headers.$wssp === "80") {
		return res.redirect('https://' + req.get('host') + req.url);
	};
	next();
};
app.use(requireHTTPS);
*/
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
// @ibm-cloud/cloudant
//
var database = require('./routes/database');
client = database.database()

//
// Access LogはRevaidation, Client Support Tool, ToolsまとめでひとつのDBに記録する
//
//		login_data = { 
//			"application": "Revalidation", 
//			"user_id": curr_user_id, 
//			"user_name": curr_user_name, 
//			"timestamp": timestamp, 
//			"status": "Success" };
//
console.log("> process.env.ENV:", process.env.ENV);
if (process.env.ENV == "prod") {
	var db_access_log = "access_log";
} else if (process.env.ENV == "nonprod-uat") {
	var db_access_log = "access_log_uat";
} else {
	var db_access_log = "access_log_dev";
}



//var helmet = require('helmet');
//
// For security
//
// https://helmetjs.github.io/
//
// 参考 : 実稼働環境におけるベスト・プラクティス: セキュリティー https://expressjs.com/ja/advanced/best-practice-security.html
//
//
const helmet = require('helmet');
const crypto = require('crypto')

//
// https://zenn.dev/tatsuyasusukida/articles/express-helmet-google-analytics
//
nonce = crypto.randomBytes(16).toString("hex");
console.log("> nonce:", nonce);

// app.use(helmet());
app.use(
helmet.contentSecurityPolicy({
	directives: {
		"img-src": [
			"'self'",
			"data:", 
			"https://w3ds-divolte.mybluemix.net",
			"https://unified-profile-api.us-south-k8s.intranet.ibm.com"
		],
		"script-src": [
			"'self'", 
			
//			appEnv.url,
			'https://ajax.googleapis.com', 
			'https://www.ibm.com', 
			'https://w3.ibm.com', 
			"https://w3ds-divolte.mybluemix.net",
			"https://cdnjs.cloudflare.com", 
			"https://github.com", 
			"https://www.gstatic.com",
			"https://cdn.datatables.net",
			"https://unpkg.com/",
			"https://objects.githubusercontent.com",
			"https://libs.coremetrics.com",
			 
			`'nonce-${nonce}'`
		],
		"style-src": ["'self'", "https:", "'unsafe-inline'"],


		//
		// Default Setting from "node_modules/helmet/dist/cjs/index.js"
		//
		"default-src": ["'self'"],
		// added "connect-src" on Sep 15 trial : open_items.ejs "Refused to connect to '<URL>' because it violates the following Content Security Policy directive: "default-src 'self'". Note that 'connect-src' was not explicitly set, so 'default-src' is used as a fallback."
		"connect-src": [
			"'self'",
//			"https://us-south.appid.cloud.ibm.com"
		], 
		"base-uri": ["'self'"],
		"block-all-mixed-content": [],
		"font-src": ["'self'", "https:", "data:"],
		"form-action": ["'self'"],
		"frame-ancestors": ["'self'"],
	//	"img-src": ["'self'", "data:"],
		"object-src": ["'none'"],
	//	"script-src": ["'self'"],
		"script-src-attr": ["'none'"],
	//	"style-src": ["'self'", "https:", "'unsafe-inline'"],
		"upgrade-insecure-requests": []

	}
})
);

//
// https://helmetjs.github.io/
//
app.use(helmet.crossOriginEmbedderPolicy(
	{
		policy: "credentialless"
	}
));
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginResourcePolicy(
//	{
//		policy: "cross-origin" 
//	}
));
app.use(helmet.dnsPrefetchControl());
//app.use(helmet.expectCt());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());

app.disable('x-powered-by');

//
// https://zenn.dev/tatsuyasusukida/articles/express-helmet-google-analytics
//
//nonce = crypto.randomBytes(16).toString("hex");
//console.log("> nonce:", nonce);


// var fs = require('fs');
const fs = require('fs');

/*
const moment = require("moment");
require('moment-timezone');
console.log(">", moment().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss"));
*/


//
// Cloudant DB
//
// @ibm-cloud/cloudant 2022.07.29
//
var database = require('./routes/database');
client = database.database();

//
// TEMP for 部品差異報告書 2022.08.04
//
//var database_pir = require("./routes/database_pir");
//client_pir = database_pir.database()

console.log("> process.env.ENV:", process.env.ENV);
if (process.env.ENV == "prod") {
	var db_pir = "pireport";
	var db_pir_users = "users";

//	var db_sendmail = "sendmail";
//	var PIR_APPL_URL = "https://partsinspectionreport.mybluemix.net/";
} else if (process.env.ENV == "nonprod-uat") {
	var db_pir = "pireport_uat";
	var db_pir_users = "users_uat";

//	var db_sendmail = "sendmail_uat";
//	var PIR_APPL_URL = "https://partsinspectionreport-uat.mybluemix.net/";
} else {
	var db_pir = "pireport_dev";
	var db_pir_users = "users_dev";

//	var db_sendmail = "sendmail_dev";
//	var PIR_APPL_URL = "https://partsinspectionreport-dev.mybluemix.net/";
//	var db_sendmail = "sendmail";
}
count = 0;
mails = [];

//
// Mail Send by nodemailer
//
/*
var nodemailer = require("nodemailer");
var smtp = nodemailer.createTransport({
	host: 'na.relay.ibm.com',
	port: 25,
	secure: false,
	requireTLS: true,
	debug: true,
	tls: {
		rejectUnauthorized: false,
		ciphers: 'AES256-GCM-SHA384'
	}
});
*/					


//
// https://cloud.ibm.com/apidocs/cloudant?code=node#postdbsinfo
// > Methods > Databases > Query information about multiple databases
//
client.getAllDbs().then(response => {
	console.log(response.result);
});


//
// フォルダ作成
//
UPLOAD_FOLDER = './public/upload';
DOWNLOAD_FOLDER = "./public/download";
PARTS_PHYSICAL_INVENTORY_FOLDER = "./public/parts_physical_inventory";

//
// フォルダ作成
//
// folders = [ multer_destination_folder, pdf_folder, macro_folder, DOWNLOAD_FOLDER ];
folders = [ UPLOAD_FOLDER, DOWNLOAD_FOLDER ];
folders.forEach(function (folder) {
	try {
		fs.statSync(folder);
		console.log("> [", folder, "] is exist.");
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log("> [", folder, "] is NOT exist.");
			
			fs.mkdir(folder, function (err) {
				if (err) {
					console.error(err);
					process.exit(1);
				}
				else {
					console.log("> Create folder [", folder, "] is finished!!");
				}
			});
		} else {
			console.log(error);
		}
	}
});

//
// node-cron
// 定期的(10分毎)にupload、pdf、macroフォルダを削除
//
const cron = require('node-cron');

cron.schedule('0 * * * * *', () => {
//	console.log("[node cron] File deletion");
	
	current_timestamp = new Date();
	target_files = [];

	//
	// ファイルの検索
	//
	folders.forEach(function (path) {
		const files = fs.readdirSync(path);
		
		files.forEach(function (file) {
			target_files.push(path + "/" + file);
		});
	});
	
	//
	// ファイルの削除
	//
	target_files.forEach(function (file) {		
		fs.stat(file, (err, stats) => {
			let time_delta = Math.floor((current_timestamp - stats.ctime) / (1000 * 60)) // 分

			if (stats.isDirectory()) {
				console.log("- DIR :", file);

				fs.readdir(file, (err, dir_files) => {
					if (err) { throw err; }
					
					//
					// フォルダが空の場合削除 2020.07.22
					// - 空のフォルダは通常は発生しないはずだが、zipする前にエラーが発生したときに起こり得る。
					//
					if (!dir_files.length) {
						console.log("> DELETE DIR:", file);
						fs.rmdir(file);
					}
				});
			} else {
				console.log("- FILE:", file, "[", time_delta, "]");

				if (time_delta >= 10) {
					fs.unlink(file, (err) => {
						if (err) {
							throw err;
						}
						
						console.log("> DELETE FILE:", file);
					});
				}
			}
		});
	});	
	


	//
	// Tempolary Solution for Parts Inspection Report Sendmail
	//	
	/*
//	console.log("[TEMP機能 for 部品差異報告書]");
	query = { db: db_pir_users, selector: { } }

//	console.log("[node cron SendMail]", count)
	if (count == 0) {
		//
		// 10分に1回User Listを取得 (毎分にするとアラートが頻発する) --- たまにユーザー登録があるので、10分置きに更新。1時間に1回でもいいけれど...
		//
		client_pir.postFind(query).then(response => {
			pir_users = response.result.docs;
			
			users = {
				Applicant: [],
				Submitter: [],
				Issuer: [],
				Verifier: [],
				Approver: [],
				Viewer: [],
				"N/A": []
			}
			
			pir_users.forEach((p) => {
				p.roles.forEach((r) => { 
					if (r.report_name == "Parts Inspection Report") {
						if ((p.mail_to == "") | (p.mail_to == undefined)) {
							if (p.user_id != undefined) {
								users[r.role].push(p.user_id);
							}
						} else {
							if (p.mail_to != undefined) {
								users[r.role].push(p.mail_to);
							}
						}
					}
				});						
			});
//			console.log("> user list", users)

			count += 1;
			rc = sendMail(users)
		});
	} else {
		count += 1;
		if (count > 10) { count = 0; }

		rc = sendMail(users)
	}
	*/
});

/*
const sendMail = (users) => {
	timestamp = moment().tz("Asia/Tokyo").format("YYYY-MM-DDTHH:mm:ssZ") // 1分前のデータを取得
	check_timestamp = moment().tz("Asia/Tokyo").add(-1, "m").format("YYYY-MM-DDTHH:mm:ssZ") // 1分前のデータを取得
//	console.log("> sendMail");
//	console.log(">", timestamp);

	date_key = check_timestamp.slice(0, 16) // 2022-08-04T16:41

	q = {
		$or : [
			{ "log.applied.date": { $regex : "^" + date_key }},
			{ "log.submitted.date": { $regex : "^" + date_key }},
			{ "log.issued.date": { $regex : "^" + date_key }},
			{ "log.verified.date": { $regex : "^" + date_key }},
			{ "log.approved.date": { $regex : "^" + date_key }},
			{ "log.completed.date": { $regex : "^" + date_key }},
			{ "log.canceled.date": { $regex : "^" + date_key }},
		]
	}

	query = { db: db_pir, selector: q }
//	client_pir.postFind(query).then(async response => { // 2022.08.09 ここのasync-awaitは役に立っているのか？
	client_pir.postFind(query).then(response => { // 2022.08.09 ここのasync-awaitは役に立っているのか？
		if (response.result.docs.length > 0) {
			console.log("> Send Mail Doc Count:", response.result.docs.length);
		}
		
		doc = response.result.docs;

		if (response.result.docs.length > 0) {
			for (d of doc) {
				mail_from = d.log[d.status].id
	
				mail_text = '<!DOCTYPE html>';
				mail_text += '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>';
				mail_text += '<body>';

				if (d.status == "applied") {
					mail_to = users.Submitter;
					subject = '【申請依頼】部品差異報告書 No.' + d.report_no;
					mail_text += "部品差異報告書[" + d.report_no + "]を起票しました。申請をお願いします。";
				} else if (d.status == "submitted") {
					mail_to = users.Issuer;
					subject = '【申請承認依頼】部品差異報告書 No.' + d.report_no;
					mail_text += "部品差異報告書[" + d.report_no + "]を申請しました。申請承認をお願いします。";
				} else if (d.status == "issued") {
					mail_to = users.Verifier;
					subject = '【検証依頼】部品差異報告書 No.' + d.report_no + " [Analyzer Code:" + d.analyzer_code + "]";
					mail_text += "部品差異報告書[" + d.report_no + "]を申請承認しました。検証をお願いします。";
				} else if (d.status == "verified") {
					mail_to = users.Approver;
					subject = '【承認依頼】部品差異報告書 No.' + d.report_no;
					mail_text += "部品差異報告書[" + d.report_no + "]を検証しました。承認をお願いします。";
				} else if (d.status == "approved") {
					mail_to = users.Submitter;
					subject = '【承認完了】部品差異報告書 No.' + d.report_no;
					mail_text += "部品差異報告書[" + d.report_no + "]を承認しました。";
				} else if (d.status == "rejected") {
					mail_to = users.Submitter;
					subject = '【却下】部品差異報告書 No.' + d.report_no; 
					mail_text += "部品差異報告書[" + d.report_no + "]を却下しました。対応をお願いします。";
				} else if ((d.status == "applied (rejected by issuer)") | (d.status == "applied (rejected by verifier)")){
					mail_to = users.Submitter;
					subject = '【却下】部品差異報告書 No.' + d.report_no; 
					mail_text += "部品差異報告書[" + d.report_no + "]を却下しました。対応をお願いします。";
				} else if (d.status == "issued (rejected by approver)") {
					mail_to = users.Verifier;
					subject = '【却下】部品差異報告書 No.' + d.report_no + " [Analyzer Code:" + d.analyzer_code + "]"; 
					mail_text += "部品差異報告書[" + d.report_no + "]を却下しました。対応をお願いします。";
				} else if (d.status == "canceled") {
					mail_to = users.Submitter;
					subject = '【キャンセル】部品差異報告書 No.' + d.report_no + " [Analyzer Code:" + d.analyzer_code + "]"; 
					mail_text += "部品差異報告書[" + d.report_no + "]をキャンセルしました。対応をお願いします。";
				} 

				// Dev環境用 (Roleが全部登録されていない)
				if (mail_to.length == 0) { mail_to = mail_from }
				if (mail_from.length == 0) { mail_from = mail_to }
				
				//
				// メール本文にテキスト追加
				//
				mail_text += "<br>";
				mail_text += "<br>";
				mail_text += "部品差異報告書: " + PIR_APPL_URL;
				mail_text += "<br><p>";
				mail_text += "<table>";
				mail_text += "<tr><td>REPORT NO :</td><td>" + d.report_no + "</td></tr>";
				mail_text += "<tr><td>REG NO :</td><td>" + d.reg_no + "</td></tr>";
				mail_text += "<tr><td>CASE NO :</td><td>" + d.case_no + "</td></tr>";
				mail_text += "<tr><td>ORDER NO :</td><td>" + d.order_no + "</td></tr>";
				mail_text += "<tr><td>ANALYZER CODE :</td><td>" + d.analyzer_code + "</td></tr>";
				mail_text += "<tr><td>STATUS :</td><td>" + d.status.toUpperCase() + "</td></tr>";
				mail_text += "</table></p>";
			
				mail_text += '</body></html>';  

				var message = {
					from: mail_from,
					to: mail_to,
					subject: subject,
					html: mail_text,
					envelope: {
						from: mail_from,
						to: mail_to
					}
				};
//				console.log("> message:", message);
	
				mail = {};
				mail.message = message;
				mail.timestamp = moment().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss");
				
				try{
					//
					// Server Replicas=3だと3回メール送信してしまう場合がある
					//
//					smtp.sendMail(message, await function(error, info) { // 2022.08.09 ここのasync-awaitは役に立っているのか？
					smtp.sendMail(message, function(error, info) {
						if(error){
							console.log("> Send mail failed");
							console.log(error.message);
							mail.status = "error";
						} else {
//							mail.status = "success";
						}
						
//						mail.error_status = "";
					});
					
					mail.status = "success";
					mail.error_status = "";
				} catch(e) {
					mail.status = "error";
					mail.error_status = e;
				}
				console.log("> mail", mail)
			
				//
				// Log
				//
				resp_doc = {
					"appl_name": "Parts Inspection Report",
					"report_no": d.report_no,
					"to": message.to,
					"from": message.from,
					"cc": "",
					"subject": message.subject,
					"html": message.html,
					"created_timestamp": timestamp,
					"status": mail.status,
					"error_status": mail.error_status,
					"mailsent_timestamp": mail.timestamp
				}

				query = { db: db_sendmail, document: resp_doc }
				client.postDocument(query).catch(error => {
					console.log("> error:", error);
					console.log("[db_sendmail] !!! Error !!!:", JSON.stringify(body));
					console.log(err);
				}).then(response => {
					console.log("[db_sendmail] *** Done ***:");
				});
			}
		}
	});
}
*/


/* ============================================================ */
// ↓ ↓ ↓ App ID & w3認証 ↓ ↓ ↓
//
// 2022.07.29 App ID
//
// $ npm i passport
// $ npm i ibmcloud-appid
//
const passport = require('passport');
const appID = require("ibmcloud-appid");
const WebAppStrategy = appID.WebAppStrategy;

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((obj, done) => {
	done(null, obj);
});
const CALLBACK_URL = "/ibm/bluemix/appid/callback";

console.log("> process.env.APPL_URL", process.env.APPL_URL)
const config = {
	tenantId: process.env.tenantId,
	clientId: process.env.clientId,
	secret: process.env.secret,
	oauthServerUrl: process.env.oauthServerUrl,
	profilesUrl: process.env.profilesUrl,
	redirectUri: process.env.APPL_URL + CALLBACK_URL,
}
console.log("> App ID Config:", config)

// Configure passportjs to use WebAppStrategy
let webAppStrategy = new WebAppStrategy(config);
const userProfileManager = appID.UserProfileManager;
passport.use(webAppStrategy);
userProfileManager.init(config);

app.get('/login', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
	forceLogin: true
}));

app.get(CALLBACK_URL, (req, res, next) => {
	passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
		allowAnonymousLogin: false,
		successRedirect: req.session.currentUrl ,
		failureRedirect: '/failure',
	})(req, res, next);
});

app.get('/failure', (req, res) => {
	res.send('login failed');
	if (req.user_id) {
		var clientIP = req.headers['x-forwarded-for'] ||
			req.connection.remoteAddress.substring(7) ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress;
		var params = {
			user_id: req.user_id,
			create_time: common.getNowTime().nTime,
			access_ip: clientIP,
			status_code: 400,
			application_category: 1,
			request_history: 'GET /Index.html',
			data_traffic: 0,
			pw_fail: 1,
			userAgent: req.headers['user-agent']
		}
	}
})

access_count = 0;
const ensureAuthenticated = async (req, res, next) => {
	if (req.url != "/login" && !req.isAuthenticated()) {
		req.session.currentUrl = req.url;
		
		console.log('redirect to login page');
		
		access_count = 0;

		return res.redirect('/login');
	} else if (req.isAuthenticated()) {
		console.log('login passed')
		err = {};
		//console.log(req.session)

		//
		// Loginした直後だけ記録する
		//
		access_count += 1;
			if (access_count == 1) {		//
			// Access Log (success)
			//
			console.log("> Write access log (success)");
	
			curr_user_id = req.session.passport.user.email;
			curr_user_name = req.session.passport.user.given_name + " " + req.session.passport.user.family_name;
			timestamp = dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss");
			login_data = { 
				"application": "client-support-tool", 
				"user_id": curr_user_id, 
				"user_name": curr_user_name, 
				"timestamp": timestamp, 
				"status": "Success" };
			rc = await writeAccessLog(login_data);
		}

		return next();
	} else {

		//
		// Access Log (error) - 多分動作する。未確認。20230829
		//
		curr_user_id = req.session.passport.user.email;
		curr_user_name = req.session.passport.user.given_name + " " + req.session.passport.user.family_name;
		timestamp = dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss");
		login_data = { 
			"application": "client-support-tool", 
			"user_id": curr_user_id, 
			"user_name": curr_user_name, 
			"timestamp": timestamp, 
			"status": "Error" };
		rc = await writeAccessLog(login_data);

		return res.status(500).send({
			msg: 'login error'
		});
	}
}
  
const admin_ensureAuthenticated = (req, res, next) => {
	if (req.url == "/admin" && !req.isAuthenticated()) {
		console.log('login redirect')
		return res.redirect('/login');
	} else if (req.isAuthenticated()) {
		return next();
	} else {
		return res.status(500).send({
			msg: 'login error'
		});
	}
}
/* ============================================================ */


//
// Access Logの記録
//
const writeAccessLog = (login_data) => {
	return new Promise(async(resolve) => {
		try {
			console.log("> login_data", login_data);

			query = { db: db_access_log, document: login_data }
			resp = await client.postDocument(query);
			console.log(resp);

			resolve(login_data);
		} catch (error) {
		//	alert(error);
		}
	});
}


var index = require("./routes/index");
var report_to_pdf = require("./routes/converter/report_to_pdf");
var parts_physical_inventory = require("./routes/converter/parts_physical_inventory");
var dmas_user_entry = require("./routes/converter/dmas_user_entry");
var bluepage_info = require("./routes/bluepage_info/index");
var sql = require("./routes/sql/index");
var sql_bprs = require("./routes/sql_bprs/index");
var cloudant_download = require("./routes/cloudant_download/index");
var watson_language_translator = require("./routes/watson_language_translator/index");
var access_logs = require("./routes/access_logs/index");

//var sendmail = require("./routes/sendmail/index");

app.use("/", ensureAuthenticated, index);
app.use("/converter/report_to_pdf", ensureAuthenticated, report_to_pdf);
app.use("/converter/parts_physical_inventory", ensureAuthenticated, parts_physical_inventory);
app.use("/converter/dmas_user_entry", ensureAuthenticated, dmas_user_entry);
app.use("/bluepage_info", ensureAuthenticated, bluepage_info);
app.use("/sql", ensureAuthenticated, sql);
app.use("/sql_bprs", ensureAuthenticated, sql_bprs);
app.use("/cloudant_download", ensureAuthenticated, cloudant_download);
app.use("/watson_language_translator", ensureAuthenticated, watson_language_translator);

app.use("/access_logs", ensureAuthenticated, access_logs);

//app.use("/sendmail", ensureAuthenticated, sendmail);

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

/*
// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
//	console.log("server starting on " + APPL_URL);
});
*/
app.listen(appEnv.port, () => {
  // print a message when the server starts listening
  console.log("> server starting on " + appEnv.url);
});


module.exports = app;
