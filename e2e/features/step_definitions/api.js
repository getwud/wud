const { Given } = require('@cucumber/cucumber');
require('apickli/apickli-gherkin');

Given(/^I set bearer token to (.*)$/, function setBearerToken(token, callback) {
    this.apickli.removeRequestHeader('Authorization');
    this.apickli.addRequestHeader('Authorization', `Bearer ${this.apickli.replaceVariables(token)}`);
    callback();
});

Given(/^I remove authorization header$/, function removeAuthHeader(callback) {
    this.apickli.removeRequestHeader('Authorization');
    callback();
});
