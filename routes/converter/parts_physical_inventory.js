//
// COnverter - parts_physical_inventory
//
console.log("[converter/parts_physical_inventory.js]")

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
parts_physical_inventory_folder = "./public/parts_physical_inventory";

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

const storage_address_file = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, parts_physical_inventory_folder)
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname)
	},
	limits: {
		fileSize: fileSizeLimit
	}
})
const upload_address_file = multer({ 
	storage: storage_address_file,
	limits: {
		fileSize: fileSizeLimit
	}
})

// const XLSX = require("xlsx");
// const utils = XLSX.utils;

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
// view_physical_inventory_address_file
//
router.get("/view_physical_inventory_address_file", (req, res, next) => {

	console.log("[convereter/parts_physical_inventory/view_physical_inventory_address_file] GET");

	viewPhisicalInventoryAddressFile(req, res, next);
});

//
// select_physical_inventory_address_file
//
router.get("/select_physical_inventory_address_file", (req, res, next) => {

	console.log("[convereter/parts_physical_inventory/select_physical_inventory_address_file] POST");

	res.render("parts_physical_inventory/select_physical_inventory_address_file",
	{
	});
});

//
// upload_physical_inventory_address_file
//
router.post("/upload_physical_inventory_address_file", upload_address_file.single('file'), (req, res, next) => {

	console.log("[convereter/parts_physical_inventory/upload_physical_inventory_address_file] POST");

	viewPhisicalInventoryAddressFile(req, res, next);
});


const viewPhisicalInventoryAddressFile = (req, res, next) => {

	const workbook = XLSX.readFile(parts_physical_inventory_folder + "/Physical_Inventory_Address_List.xlsx");
	const worksheet = workbook.Sheets["グループ別"];
	
	address_list = [];
	
	let range = worksheet['!ref'];
	let rangeVal = utils.decode_range(range);
	for (let r=rangeVal.s.r + 1; r <= rangeVal.e.r; r++) {
		console.log(r, worksheet[utils.encode_cell({c:1, r:r})])
		if ((worksheet[utils.encode_cell({c:0, r:r})] != undefined) && (worksheet[utils.encode_cell({c:1, r:r})] != undefined)){
			data = [];
			data[0] = worksheet[utils.encode_cell({c:0, r:r})].v;
			data[1] = worksheet[utils.encode_cell({c:1, r:r})].v;

//			if (data[0] == "(1) セントラル") {
//				console.log(data[1])
//			}
			address_list.push(data);
		}
	}
//	console.log("> address_list:", address_list)

	res.render("parts_physical_inventory/view_physical_inventory_address_file",
	{
		address_list: address_list
	});
}



//
// ファイルの選択画面
//
router.get("/select_file", (req, res, next) => {

	console.log("[convereter/parts_physical_inventory/select_file] POST");

	res.render("parts_physical_inventory/select_file",
	{
	});
});


//
// ファイルの選択
//
router.get("/upload_file", (req, res, next) => {

	console.log("[convereter/parts_physical_inventory/upload_file] POST");

	res.render("parts_physical_inventory/upload_file",
	{
	});
});


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
// PDFファイルへの変換
//
router.post('/upload_file', upload.single('file'), function (req, res, next) {

	console.log("[convereter/parts_physical_inventory/upload_file] POST");

	// 現在の日時を取得
	const current_timestamp = getCurrentTime();
	let ct = current_timestamp.slice(2,4) + current_timestamp.slice(5,7) + current_timestamp.slice(8,10) + "_" + current_timestamp.slice(11,13) + current_timestamp.slice(14,16) + current_timestamp.slice(17,19 );

	//
	// Address Listの読み込み
	//
	address_list = {};
	bo_list = {};
	
	const workbook = XLSX.readFile(parts_physical_inventory_folder + "/Physical_Inventory_Address_List.xlsx");
	const worksheet = workbook.Sheets["グループ別"];
	let range = worksheet['!ref'];
	let rangeVal = utils.decode_range(range);
	for (let r=rangeVal.s.r + 1; r <= rangeVal.e.r; r++) {
		if ((worksheet[utils.encode_cell({c:0, r:r})] != undefined) && (worksheet[utils.encode_cell({c:1, r:r})] != undefined)){
			data = [];
			data[0] = worksheet[utils.encode_cell({c:0, r:r})].v;
			data[1] = worksheet[utils.encode_cell({c:1, r:r})].v;
			
			if (address_list[data[0]] == undefined) { 
				address_list[data[0]] = [];
			}
			
			address_list[data[0]].push(data[1]);
			bo_list[data[1]] = data[0];
		}
	}
//	console.log("> address_list", address_list);


	//
	// 初期値
	//
	div = div_prev = "";
	pims_loc = pims_loc_prev = "";
	new_div = new_pims_loc = "";
	
	l_in_source = l_in_page = 0;
	page_no = control_no = "";
	
	in_chart = "";
	line_first = line_status = "";
	
	page_line_0 = "";
	chart_end_space = 0;
	
	x = x_all = 0;
	
	doc_types = [ "TRANSMITTAL LIST", "COUNTS DOCUMENT", "ADJUSTMENTS DOCUMENT" ];
	
	pdf_y = 0;
	
	report_temp = download_folder + "/" + ct;


	// PDF作成用フォルダの作成
	fs.mkdir(report_temp, function (err) {
		if (err) {
			console.error(err);
			process.exit(1);
		}

		console.log("> Create folder [", report_temp, "] is finished!!");

		//
		// Address List毎の表紙作成
		//
		group_keys = Object.keys(address_list);
		
		doc_g = {};
		group_keys.forEach(function (key) { 
			doc_g[key] = new PDFDocument( { layout: "landscape", size: "A4", margin: 0 } );
			doc_g[key].pipe(fs.createWriteStream(report_temp + "/" + key + ".pdf"));

			//
			// 2020.07.22現在、IBM Plexはまだ日本語サポートしていないのでGenShinGothicを使用
			//
		//	doc_g[key].font("./public/font/GenShinGothic-Monospace-Regular.ttf");
		//	doc_g[key].font("./public/font/IBMPlexMono-Regular.ttf");
			doc_g[key].font("./public/font/IBMPlexMono-Text.ttf");
			
			x = 100;
			y = 200;
			delta = 30;
	
			doc_g[key].fontSize(48);
			doc_g[key].text("Physical Inventory:", x, y);				
			doc_g[key].fontSize(24);

		doc_g[key].font("./public/font/IBMPlexSansJP-Text.ttf");
			doc_g[key].text("Groups:" + key, x, y + delta * 2);				
		doc_g[key].font("./public/font/IBMPlexMono-Text.ttf");

			doc_g[key].text("Created Date:" + ct, x, y + delta *3);				
	//		doc_g[key].end(); // *** 最後にまとめてCloseする ***
		});


		var file = fs.readFileSync(req.file.path, 'utf8')
		var lines = file.toString().split('\n');
	
try {
		lines.forEach(function (line) {
			line = rTrim(line);

			if (line.slice(0, 4) == "1RC#") {
	
				l_in_page = 0
		
				// 1行目のLineをBuffer
				page_line_0 = line
	
				//
				// TRANSMITTAL LIST or ADJUSTMENTS DOCUMENT
				//
				if (line.length == 24) {
					doc_type = "TRANSMITTAL LIST or ADJUSTMENTS DOCUMENT"
					div = line.slice(-4);
		
					(div != div_prev) ? new_div = "YES" : new_div = "NO";
					div_prev = div;
					new_pims_loc = "---";
					pims_loc = pims_loc_prev = "---";
	
				//
				// COUNTS DOCYMENT
				//
				} else if (line.length == 27) { 
					doc_type = "COUNTS DOCUMENT"
					pims_loc = line.slice(-3);
						
					if (new_div == "YES") {
						new_pims_loc = "YES"
					} else {
						(pims_loc != pims_loc_prev) ? new_pims_loc = "YES" : new_pims_loc = "NO";
					}
					pims_loc_prev = pims_loc;
				}
			}

			//
			// 2行目のチェック (DOCUMENT TYPEを確定)
			//
			if (l_in_page == 1) {
				//
				// TRANSMITTAL PAGE
				//
				if (line.slice(-11, -7) == "PAGE") {
					doc_type = "TRANSMITTAL LIST"
					page_no = line.slice(-6).trim();
		
					//
					// 新規DIVのTRANSMITTAL LIST" Page 1で新しいEXCEL SHEETを作成
					//
					if (page_no == "1") {
						if (l_in_source != 1) {
							//
							// PDF FIle保存
							//
							doc.end();
		
							pdf_y = 0;
						}
		
						//
						// PDF FIle作成 & 設定
						//
						doc = new PDFDocument( { layout: "landscape", size: "A4", margin: 0 } );
						pdf_file = div + ".pdf";
						doc.pipe(fs.createWriteStream(report_temp + "/" + pdf_file));
					//	doc.font("./public/font/GenShinGothic-Monospace-Regular.ttf");
						doc.font("./public/font/IBMPlexMono-Text.ttf");

						xpos_h = 100;
						ypos_h = 200;
						ydelta_h = 30;

						doc.fontSize(48);

						console.log("bo_list[div]", bo_list[div]);
						doc_g[bo_list[div]].fontSize(48);
						doc.text("Physical Inventory", xpos_h, ypos_h);
						doc_g[bo_list[div]].addPage();
						doc_g[bo_list[div]].text("Physical Inventory", xpos_h, ypos_h);

						doc.fontSize(24);
						doc_g[bo_list[div]].fontSize(24);
						doc.text("Division Code: " + div, xpos_h, ypos_h + ydelta_h * 2);
						doc_g[bo_list[div]].text("Division Code: " + div, xpos_h, ypos_h + ydelta_h * 2);
						doc.text("Created Date : " + ct, xpos_h, ypos_h + ydelta_h * 3);
						doc_g[bo_list[div]].text("Created Date : " + ct, xpos_h, ypos_h + ydelta_h * 3);

						console.log("- DIV:", div, bo_list[div]);
					}
	
				//
				// COUNTS DOCUMENT
				//
				} else if (line.slice(-22,-8) == "CONTROL NUMBER") {
					control_no = line.slice(-8,-1).trim()
		
					if (new_pims_loc == "YES") {
						x = 0;
					}
		
					if (control_no == "00001") {
						x = 0;
					}
		
				} else if (line.slice(-18,-8) == "B/O NUMBER") {
					doc_type = "ADJUSTMENTS DOCUMENT";
					x = 0;
				}
			}
	
			if (doc_type == "TRANSMITTAL LIST") {
				//
				// TRANSMITTAL LISTのリストが改行などで行数がおかしくなっている場合、(2)(3)のrange(x,y)の割合を変えてみる(合計123になるようにするのが無難)
				// (4)は1文字だけ改行されている場合の処理
				// (1)が正常ケース
				//
				if (line.indexOf("_________________________________________________________________________________________________________________") !== -1) { 
					in_chart = "YES";
					chart_end_space = 0;
				} else if (line.indexOf("|___________________________________________|______________________|_____|____________________________|_________|") !== -1) {
					chart_end_space = 0;
				} else if ((line == "") & (chart_end_space > 0)) {
					in_chart = "NO";
				}
		
				if (in_chart == "YES") {
					if (line.length == 122) { // ---(1)
						if (line.indexOf("|										   |					  |	 |							|		 |") !== -1) {
							line_status = "SKIPPED"; // 印刷する際、他のページとレイアウトを合わせるために間引き
						} else {
							line_status = "COMPLETED";
						}
					} else {
						if ((55 <= line.length) & (line.length <= 100)) { // ---(2) → (3) で一行完成
							line_status = "CONTINUE";
							line_first = rTrim(line) + " ";
						} else if(line.length == 0) { // ---(4) ((3)の前に置くこと)
							line_first += " ";
							chart_end_space += 1;
						} else if (line_status == "CONTINUE") { // (3)
							line = line_first + line;
							line_status = "COMPLETED";
						}
					}
				} else{ 
					line_status = "COMPLETED";
				}
			}
	
			//
			// PDFへの書き出し
			//
			if (line_status == "COMPLETED") {
				x += 1;
				x_all += 1;
		
				if ((l_in_page > 0) & (doc_types.indexOf(doc_type) !== -1)) {
		
					//
					// 各ページの最初の行(1RC#の行)のEXCELへの出力と改ページ挿入
					//
					if ((line.slice(-11,-7) == "PAGE") || (line.slice(-22,-8) == "CONTROL NUMBER") || ((doc_type == "ADJUSTMENTS DOCUMENT") & (line.slice(-18,-8) == "B/O NUMBER"))) {
						
						//
						// PDFの改ページ
						//
						doc.addPage();
						doc_g[bo_list[div]].addPage();
						pdf_y = 0;
					}
		
					// Debugで使用
					//	console.log(l_in_source, l_in_page, x_all, x, div, pims_loc, doc_type.slice(0,5), "---", "|", rTrim(line.slice(0,75)))
		
					//
					// PDFへの出力
					//
					doc.fontSize(9);
					doc_g[bo_list[div]].fontSize(9);
//					interval = 11 ;
					interval = 10 ;
					
//					x = 110;
//					y = 80;
					x = 75;
					y = 30;
					
					pdf_y += 1;
					if (pdf_y == 1) {
						doc.text(rTrim(page_line_0), x, y + (pdf_y * interval));
						doc_g[bo_list[div]].text(rTrim(page_line_0), x, y + (pdf_y * interval));
						pdf_y += 1;
					}
						
					doc.text(rTrim(line), x, y + (pdf_y * interval));
					doc_g[bo_list[div]].text(rTrim(line), x, y + (pdf_y * interval));
		
				} else {
				// Debugで使用
				//	console.log(l_in_source, l_in_page, x_all, x, div, pims_loc, doc_type.slice(0,5), "---", "|", rTrim(line.slice(0,75)))
				}
			}

			l_in_source += 1;
			l_in_page += 1;
		});
} catch (err) {
	res.render("parts_physical_inventory/error",
	{
		div: div,
		bo_list: bo_list[div],
		err: err,
		error_details : "Maybe DIV [" + div + "] is not in Address List"
	});
	
	return
}

	
		doc.end();
		console.log("> PDF DONE");


		// 
		// Address ListのPDFファイルのClose
		//
		group_keys.forEach(function (key) { 
//				console.log("> END:", key);
			doc_g[key].end();
		});
			

		//
		// pdfファイルのリスト
		//
		fs.readdir(report_temp, function (err, files) { 
			if (err) {
				console.error(err);
				process.exit(1);
			}
		
			//
			// 全てのPDFファイルをzipファイルに圧縮
			//
			console.log("> Zip all files");
			var zip_file_name = download_folder + "/pysical_inventory_" + ct + ".zip"
			var archive = archiver.create('zip', {
				zlib: { level: 9 }
			});
			var output = fs.createWriteStream(zip_file_name);
			archive.pipe(output);
			
			//
			// ZIPするファイルの追加
			//
	//		archive.append('dummy text', { name: 'readme.txt' });
			files.forEach(function (file) { 
				archive.file(report_temp + "/" + file, { "name": file });
//				console.log("-", file);
			});
		
			output.on("close", function () {
				console.log("> Archive PDF files");
				console.log("-", archive.pointer() + ' total bytes');
				console.log("- Archiver has been finalized and the output file descriptor has closed.");
				console.log("- ZIP file name:", zip_file_name);


				// レポート作成用フォルダの削除(ファイルごと削除)
				console.log("> PDF作成用フォルダの削除", report_temp);
				// fs.rmdir(report_temp, { recursive: true });
				var rimraf = require("rimraf");
				rimraf(report_temp, () => {
					console.log("done");
				});

				//
				// ZIPファイルのダウンロードページへ移動
				//
				res.render("parts_physical_inventory/download_file",
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



module.exports = router;