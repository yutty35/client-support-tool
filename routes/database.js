//
// Cloudant DB
//

require('dotenv').config();
const { CloudantV1 } = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

exports.database = () => {
	const authenticator = new IamAuthenticator({
		apikey: process.env.cloudant_iamApiKey
	});
	const service = new CloudantV1({
		authenticator: authenticator
	});
	service.setServiceUrl(process.env.cloudant_url);

	return service;
};