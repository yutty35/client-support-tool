//
// COnverter - DMaS User Entry
//
console.log("[converter/dmas_user_entry.js]")

var express = require('express');
var router = express.Router();

var env;

var cfenv = require('cfenv');

((process.env.ENV == "prod") || (process.env.ENV == "nonprod")) ? env = "server" : env = "local";
(env == "server") ? APPL_URL = process.env.APPL_URL : APPL_URL = "";

var fs = require('fs');
var PDFDocument = require('pdfkit');
var archiver = require('archiver');
var rimraf = require('rimraf')

upload_folder = './public/upload';
download_folder = "./public/download";

const multer = require('multer')
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, upload_folder)
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname)
	},
	limits: {
		fileSize: 8000000
	}
})
const upload = multer({ 
	storage: storage,
	limits: {
		fileSize: 8000000
	}
})

//const XLSX = require("xlsx");
//const utils = XLSX.utils;
//
// read-excel-file
// https://www.npmjs.com/package/read-excel-file
const readXlsxFile = require('read-excel-file/node')


//	
// 現在の日時の取得
//
const getCurrentTime = function () {
	let date = new Date();

	if (env == "server") {
		date.setHours(date.getHours() + 9);
	} else if (env == "local") {
		date.setHours(date.getHours());
	}
	
//	date.setMonth(date.getMonth() - 3);

	let d = date.getFullYear() + '-';
	d += ('0' + (date.getMonth() + 1)).slice(-2) + '-';
	d += ('0' + date.getDate()).slice(-2) + 'T';
	d += ('0' + date.getHours()).slice(-2) + ':';
	d += ('0' + date.getMinutes()).slice(-2) + ':';
	d += ('0' + date.getSeconds()).slice(-2) + 'Z';

	return d;
};


const toHalfWidth = (strVal) => {
  // 半角変換
  var halfVal = strVal.replace(/[！-～]/g,
    function( tmpStr ) {
      // 文字コードをシフト
      return String.fromCharCode( tmpStr.charCodeAt(0) - 0xFEE0 );
    }
  );
 
  // 文字コードシフトで対応できない文字の変換
  return halfVal.replace(/”/g, "\"")
    .replace(/’/g, "'")
    .replace(/‘/g, "`")
    .replace(/￥/g, "\\")
    .replace(/　/g, " ")
    .replace(/〜/g, "~");
}


//
// ファイルの選択画面
//
router.get("/select_file", (req, res, next) => {

	console.log("[convereter/dmas_user_entry/select_file] POST");

	res.render("dmas_user_entry/select_file",
	{
	});
});

//
// ファイルの選択
//
router.get("/select_file", (req, res, next) => {

	console.log("[convereter/dmas_user_entry/select_file] GET");

	res.render("dmas_user_entry/upload_file",
	{
	});
});

//
// PDFファイルへの変換
//
router.post('/upload_file', upload.single('file'), async (req, res, next) => {

	console.log("[convereter/dmas_user_entry/upload_file] POST");
	
	user_data = [];

	excel_file = req.file.path;
	console.log("> excel_file", excel_file);
	
	await readXlsxFile(excel_file).then((rows) => {
		console.log("===>", rows.length);
		
		row_num = 0;
		rows.forEach(r => {
			// Title行は除く
			if (row_num != 0) {
				data = [ r[0], r[1], r[2], r[3] ];
				user_data.push(data);
			}
			row_num += 1;
		});
	})	
	
	console.log("> user_data", user_data)


	file_name = "ch86_user_entry.mac"

	// 現在の日時を取得
	const current_timestamp = getCurrentTime();
	let ct = current_timestamp.slice(2,4) + current_timestamp.slice(5,7) + current_timestamp.slice(8,10) + "_" + current_timestamp.slice(11,13) + current_timestamp.slice(14,16) + current_timestamp.slice(17,19 );

	report_temp = download_folder + "/" + ct;


	// PDF作成用フォルダの作成
	fs.mkdir(report_temp, function (err) {
		if (err) {
			console.error(err);
			process.exit(1);
		}

		// Login Macroのコピー
		fs.createReadStream("./public/dmas_user_entry/ch86_login.mac").pipe(fs.createWriteStream(report_temp + "/ch86_login.mac"));

		data = '<HAScript name="DTSO CH86 DMASユーザー登録" description="" timeout="60000" pausetime="300" promptall="true" blockinput="false" author="" creationdate="" supressclearevents="false" usevars="false" ignorepauseforenhancedtn="true" delayifnotenhancedtn="0" ignorepausetimeforenhancedtn="true">\n';

		updater_id = "Admin";
		
		i = 0;
		user_data.forEach(function (ud) {
			u_id = ud[0] + "[tab]"

			u_role = ud[1]
			if (u_role.length < 3) {
				u_role += "[tab]";
			}
		
			u_category = ud[2];
			if (u_category.length < 4) {
				u_category += "[tab]";
			}
				
			u_mabo = ud[3];
		
			console.log("[", i - 1, "] ID:", u_id, " | ROLE:", u_role, " | CATEGORY:", u_category, " | MABO:", u_mabo);
		
			data += '\n';
			data += '<screen name="DataInput' + (i - 1) + '" entryscreen="true" exitscreen="false" transient="false">\n';
			data += '<description >\n';
			data += '<oia status="NOTINHIBITED" optional="false" invertmatch="false" />\n';
			data += '<numfields number="55" optional="false" invertmatch="false" />\n';
			data += '<numinputfields number="8" optional="false" invertmatch="false" />\n';
			data += '</description>\n';
			data += '<actions>\n';
			data += '<input value="' + u_id + '" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			data += '<input value="' + u_role + '" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			data += '<input value="' + u_category + '" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			data += '<input value="' + u_mabo + '" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			if (String(u_mabo).length == 4) {
				data += '<input value="[tab][tab]" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			} else {
				data += '<input value="[tab][tab][tab]" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			}
			data += '<input value="' + updater_id + '" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			data += '<input value="[enter]" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			data += '<input value="[pf2]" row="0" col="0" movecursor="true" xlatehostkeys="true" encrypted="false" />\n';
			data += '</actions>\n';
			data += '<nextscreens timeout="0" >\n';

			if (i < user_data.length - 1) {
				data += '<nextscreen name="DataInput' + i + '" />\n';
			}
			data += '</nextscreens>\n';
			data += '</screen>\n';

			i += 1;
		});

		data += '\n';
		data += '</HAScript>';


		// MACファイルへの書き出し
		fs.writeFile(report_temp + "/" + file_name, data, (err) => {
			if (err) throw err;
			console.log("> Creating", file_name, ": done");



			fs.readdir(report_temp, function (err, files) { 
				if (err) {
					console.error(err);
					process.exit(1);
				}
	
				//
				// zipファイルに圧縮
				//
				console.log("> Zip all files");
				var zip_file_name = download_folder + "/DMaS_" + ct + ".zip"
				var archive = archiver.create('zip', {
					zlib: { level: 9 }
				});
				var output = fs.createWriteStream(zip_file_name);
				archive.pipe(output);
				
				//
				// ZIPするファイルの追加
				//
				files.forEach(function (file) { 
					archive.file(report_temp + "/" + file, { "name": file });
				});
			
				output.on("close", () => {
					console.log("> Archive PDF files");
					console.log("-", archive.pointer() + ' total bytes');
					console.log("- Archiver has been finalized and the output file descriptor has closed.");
					console.log("- ZIP file name:", zip_file_name);
	
					// レポート作成用フォルダの削除(ファイルごと削除)
					console.log("> PDF作成用フォルダの削除", report_temp);
					// fs.rmdir(report_temp, { recursive: true });
				
					const fs_e = require('fs-extra');
					fs_e.remove(report_temp, (err) => {
						if (err) throw err;
					
					 	console.log("> Deleted:", report_temp);
					});

					//
					// ZIPファイルのダウンロードページへ移動
					//
					res.render("dmas_user_entry/download_file",
					{
						zip_file_name: zip_file_name
					});
				});

				output.on('end', function() {
					console.log('Data has been drained');
				});
	
				archive.on('error', function(err) {
					throw err;
				});
				
				archive.finalize();
			});
		});
	});
});


module.exports = router;