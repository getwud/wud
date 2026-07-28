import { Given, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import registryOracle from '../support/registry_oracle';

function substituteVariables(str: string, apickli: any): string {
    return str.replace(/`([^`]*)`/g, (match, p1) => apickli.getGlobalVariable(p1) || match);
}

Given(/^I resolve the latest version for image "([^"]*)" on registry "([^"]*)" with strategy "([^"]*)" and pattern "([^"]*)" and value "([^"]*)" as "([^"]*)"$/, async function (this: any, imageName: string, registry: string, strategy: string, pattern: string, value: string, varName: string) {
    let version;
    if (strategy === 'static') {
        version = value;
    } else {
        version = await registryOracle.getLatestVersion(registry, imageName, pattern);
    }
    this.apickli.setGlobalVariable(varName, version);
});

Given(/^I get the latest version for image "([^"]*)" on registry "([^"]*)" with pattern "([^"]*)" and store it in "([^"]*)"$/, async function (this: any, imageName: string, registry: string, pattern: string, varName: string) {
    const version = await registryOracle.getLatestVersion(registry, imageName, pattern);
    this.apickli.setGlobalVariable(varName, version);
});

Given(/^I get the latest digest for image "([^"]*)" on registry "([^"]*)" with tag "([^"]*)" and store it in "([^"]*)"$/, async function (this: any, imageName: string, registry: string, tag: string, varName: string) {
    const digest = await registryOracle.getLatestDigest(registry, imageName, tag);
    this.apickli.setGlobalVariable(varName, digest);
});

Then(/^response body path (.*) should equal variable "([^"]*)"$/, function (this: any, path: string, varName: string) {
    const expectedValue = this.apickli.getGlobalVariable(varName);
    const actualValue = this.apickli.evaluatePathInResponseBody(path);
    assert.strictEqual(String(actualValue), String(expectedValue), `Expected ${expectedValue} at ${path}, but got ${actualValue}`);
});

Given(/^I set variable "([^"]*)" to "([^"]*)"$/, function (this: any, varName: string, value: string) {
    const substitutedValue = substituteVariables(value, this.apickli);
    this.apickli.setGlobalVariable(varName, substitutedValue);
});

Then('response body should have substituted {string}', function (this: any, expectedContent: string) {
    const safeExpectedContent = substituteVariables(expectedContent, this.apickli);
    const responseBody = this.apickli.getResponseObject().body;
    assert.ok(responseBody.includes(safeExpectedContent), `Response body should contain ${safeExpectedContent}`);
});

Then(/^response body should have substituted string:$/, function (this: any, expectedString: string) {
    const safeExpectedString = substituteVariables(expectedString, this.apickli);
    const responseBody = this.apickli.getResponseObject().body;
    assert.ok(responseBody.includes(safeExpectedString), `Response body should contain ${safeExpectedString}`);
});
