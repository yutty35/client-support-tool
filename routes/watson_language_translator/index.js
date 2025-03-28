//
// watson_language_translator
//
var express = require('express');
var router = express.Router();

//
// Get data from Cloudant NoSQL DB
//
console.log("> watson_language_translator")
// console.log("> process.env.LANGUAGE_TRANSLATOR_IAM_APIKEY", process.env.LANGUAGE_TRANSLATOR_IAM_APIKEY)
// console.log("> process.env.LANGUAGE_TRANSLATOR_URL", process.env.LANGUAGE_TRANSLATOR_URL)

//
// fs
//
var fs = require('fs').promises;

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
// write-excel-file
// https://www.npmjs.com/package/write-excel-file
//
const writeXlsxFile = require('write-excel-file/node');


//
// Top Page 
//
router.get("/", async (req, res, next) => {
	console.log("[index.js] GET");

	res.render("watson_language_translator/index",
	{
		original_text: "",
		translated_text_1: "",
		translated_text_2: ""
	});
});


//
// CH86 DMaS: User Table SQL
//
router.get("/translate", async (req, res, next) => {

	original_text = req.query.original_text.trim();
	console.log("> Include japanese?", await includeJa(original_text));
//	console.log("> original_text", original_text);
	include_ja = await includeJa(original_text);
	
	if (include_ja == true) {
		lang1 = "ja";
		lang2 = "en";
	} else {
		lang1 = "en";
		lang2 = "ja";
	}
	
	//
	// https://www.npmjs.com/package/ibm-watson
	// % npm install ibm-watson
	//
	const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
	const { IamAuthenticator } = require('ibm-watson/auth');

	//
	// https://cloud.ibm.com/docs/language-translator?topic=language-translator-release-notes&locale=ja
	//
	// サービス API のバージョン管理
	// Language Translator v3 の API 要求では、version=YYYY-MM-DD という形式で日付を設定した version パラメーターが必要です。 
	// 後方互換性のない方法で API が変更されると、API の新規マイナー・バージョンがリリースされます。
	// API 要求ごとに version パラメーターを送信します。 本サービスでは、指定された日付の API バージョン、またはその日付より前の最新のバージョンが使用されます。 
	// 現在日付をデフォルトに設定しないでください。 
	// 代わりに、ご使用のアプリと互換性のあるバージョンに一致する日付を指定し、より新しいバージョン用にアプリの準備ができるまでその日付を変更しないでください。
	//
	// 現行のバージョンは 2018-05-01 です。
	//
	const languageTranslator = new LanguageTranslatorV3({
		authenticator: new IamAuthenticator({ apikey: process.env.LANGUAGE_TRANSLATOR_IAM_APIKEY	}),
		serviceUrl: process.env.LANGUAGE_TRANSLATOR_URL,
		version: '2019-02-01',
	});

	if (original_text != "") {

		response1 = await languageTranslator.translate(
			{
				text: original_text,
				source: lang1,
				target: lang2
			});
			
	//	console.log("> response1", JSON.stringify(response1.result));	
		translated_text_1 = response1.result.translations[0].translation;
	
		response2 = await languageTranslator.translate(
			{
				text: translated_text_1,
				source: lang2,
				target: lang1
			});
			
	//	console.log("> response", JSON.stringify(response2.result));
		translated_text_2 = response2.result.translations[0].translation
	} else {
		translated_text_1 = "";
		translated_text_2 = "";
	}
	
//	console.log("> original_text:", original_text)
//	console.log("> translated_text_1:", translated_text_1)
//	console.log("> translated_text_2:", translated_text_2)

	original_text = original_text.split("\r\n").join("<br>");
	
	res.render("watson_language_translator/index",
	{
		original_text: original_text,
		translated_text_1: translated_text_1,
		translated_text_2: translated_text_2
	});
});


//
// 日本語かどうか判断
//
// https://muchilog.com/javascript-js-ja-include/
//
// const includeJa = async (text) => {
const includeJa = (text) => {
	return new Promise(resolve => {
		try {
			let gmi = 'gmi';
			let regeIncludeHiragana = '^(?=.*[\u3041-\u3096]).*$';
			let regeIncludeKatakana = '^(?=.*[\u30A1-\u30FA]).*$';
			let regeIncludeKanji = '^(?=.*[\u4E00-\u9FFF]).*$';
			let regeHiragana = new RegExp(regeIncludeHiragana, gmi);
			let regeKatakana = new RegExp(regeIncludeKatakana, gmi);
			let regeKanji = new RegExp(regeIncludeKanji, gmi);
	
			let includeJa = false;
			if (regeHiragana.test(text))
				includeJa = true;
			if (regeKatakana.test(text))
				includeJa = true;
			if (regeKanji.test(text))
				includeJa = true;
	
	//		return includeJa;
			resolve(includeJa);
		} catch (error) {
		//	alert(error);
		}
	});
}

module.exports = router;