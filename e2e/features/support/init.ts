import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import configuration from '../../config';

const apickli = require('apickli');

setDefaultTimeout(60 * 1000);

Before(function (this: any) {
    this.apickli = new apickli.Apickli(configuration.protocol, `${configuration.host}:${configuration.port}`);
    this.apickli.addHttpBasicAuthorizationHeader(configuration.username, configuration.password);
});
