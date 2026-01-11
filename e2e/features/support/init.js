const apickli = require('apickli');
const { Before, setDefaultTimeout } = require('@cucumber/cucumber');
const configuration = require('../../config');

setDefaultTimeout(20 * 1000);

Before(function initApickli() {
    this.apickli = new apickli.Apickli(configuration.protocol, `${configuration.host}:${configuration.port}`);
    this.apickli.addHttpBasicAuthorizationHeader(configuration.username, configuration.password);
});
