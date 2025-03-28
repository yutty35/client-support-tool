//
// COnverter - parts_physical_inventory
//
console.log("[converter/report_to_pdf.js]")

var express = require('express');
var router = express.Router();

var env;

var cfenv = require('cfenv');
//var appEnv = cfenv.getAppEnv();

//(appEnv.isLocal == true) ? env = "local" : env = "server";

// var cradle = require('cradle');
var fs = require('fs');
//const csv = require('csv');

//var appEnv = cfenv.getAppEnv();
//APPL_URL = appEnv.url.toLowerCase();
((process.env.ENV == "prod") || (process.env.ENV == "nonprod")) ? env = "server" : env = "local";
(env == "server") ? APPL_URL = process.env.APPL_URL : APPL_URL = "";


var fs = require('fs');
var PDFDocument = require('pdfkit');
var archiver = require('archiver');

upload_folder = './public/upload';
download_folder = "./public/download";

const multer = require('multer')
const fileSizeLimit = 8000000
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, upload_folder)
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname)
	},
	limits: {
		fileSize: fileSizeLimit
	}
})
const upload = multer({ 
	storage: storage,
	limits: {
		fileSize: fileSizeLimit
	}
})



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
// RTrim
//
const rTrim = (str) => {
	//return str.replace(/\s+$/,"");
	let end = str.length - 1;
    while (end >= 0 && /\s/.test(str[end])) {
        end--;
    }
    return str.substring(0, end + 1);
}


//
// ファイルの選択画面
//
router.get("/select_file", (req, res, next) => {

	console.log("[convereter/report_to_pdf/select_file] POST");

	res.render("report_to_pdf/select_file",
	{
	});
});

//
// ファイルの選択
//
router.get("/upload_file", (req, res, next) => {

	console.log("[convereter/report_to_pdf/upload_file] POST");

	res.render("report_to_pdf/upload_file",
	{
	});
});

//
// PDFファイルへの変換
//
router.post('/upload_file', upload.single('file'), function (req, res, next) {

	console.log("[convereter/report_to_pdf/upload_file] POST");
	
	var file = fs.readFileSync(req.file.path)
	var lines = file.toString().split('\n');

//	// 現在の日時を取得
//	const current_timestamp = getCurrentTime();
//	let ct = current_timestamp.slice(2,4) + current_timestamp.slice(5,7) + current_timestamp.slice(8,10) + "_" + current_timestamp.slice(11,13) + current_timestamp.slice(14,16) + current_timestamp.slice(17,19 );

	pos = req.file.path.lastIndexOf("/");
	fn = req.file.path.slice(pos + 1);

	doc = new PDFDocument( { layout: "landscape", size: "A4", margin: 0 } );
//	doc = new PDFDocument( { layout: "landscape" } );
	pdf_file = fn + ".pdf";
	doc.pipe(fs.createWriteStream(download_folder + "/" + pdf_file))
	doc.fontSize(8);

//	doc.font("./public/font/GenShinGothic-Monospace-Regular.ttf")
//	doc.font("./public/font/IBMPlexMono-Regular.ttf");
	doc.font("./public/font/IBMPlexMono-Text.ttf");

	// ページの最初の左上の4文字
	report_types = [ "1IBM", "1RC#"]
	page_count = 0;

	lines.forEach(function (line) {

		if (report_types.indexOf(line.slice(0, 4)) !== -1) {
			// ページの起点
			x = 100;
			y = 50;
//			x = 160;
//			y = 70;
//			x = 50;
//			y = 50;
		
			if (page_count > 0) {
				doc.addPage();
			}

			if (page_count % 10 == 0) {
				console.log("- New page:", line.slice(0, 4), page_count);
			}
			page_count += 1;
		}
		
		doc.text(rTrim(line), x, y);
		y += 8;
//		doc.text(line.trim())
//		doc.moveDown(0.5);
	});
	doc.end();
	console.log("> END");
	
	res.render("report_to_pdf/download_file",
	{
		pdf_file: pdf_file
	});
});



module.exports = router;