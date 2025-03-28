//
// Converter Node.js - Index
//
console.log("[index.js]")

var express = require('express');
var router = express.Router();

//
// REPORTING FORM PORTAL TOP - GET 
//
router.get("/", (req, res, next) => {

	console.log("[/index.js] GET")
	
	curr_user_id = req.session.passport.user.email;
	curr_user_name = req.session.passport.user.given_name+" "+req.session.passport.user.family_name;
	console.log("> User ID:", curr_user_id);
	console.log("> User Name:", curr_user_name);

	res.render("index",
	{
	});
});


module.exports = router;
