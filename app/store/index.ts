import joi from 'joi';
import Loki from 'lokijs';
import fs from 'fs';
import logger from '../log';
const log = logger.child({ component: 'store' });
import { getStoreConfiguration } from '../configuration';

import * as app from './app';
import * as container from './container';

// Store Configuration Schema
const configurationSchema = joi.object().keys({
    path: joi.string().default('/store'),
    file: joi.string().default('wud.json'),
});

// Validate Configuration
const configurationToValidate = configurationSchema.validate(
    getStoreConfiguration() || {},
);
if (configurationToValidate.error) {
    throw configurationToValidate.error;
}
const configuration = configurationToValidate.value;

// Loki DB
const db = new Loki(`${configuration.path}/${configuration.file}`, {
    autosave: true,
    serializationMethod: 'pretty'
});

function createCollections() {
    app.createCollections(db);
    container.createCollections(db);
}

/**
 * Load DB.
 * @param err
 * @param resolve
 * @param reject
 */
async function loadDb(err: any, resolve: (value: void) => void, reject: (reason?: any) => void) {
    if (err) {
        reject(err);
    } else {
        // Create collections
        createCollections();
        resolve();
    }
}

/**
 * Init DB.
 */
export async function init() {
    log.info(`Load store from (${configuration.path}/${configuration.file})`);
    if (!fs.existsSync(configuration.path)) {
        log.info(`Create folder ${configuration.path}`);
        fs.mkdirSync(configuration.path);
    }

    return new Promise<void>((resolve, reject) => {
        db.loadDatabase({}, (err) => loadDb(err, resolve, reject));
    });
}

/**
 * Get configuration.
 */
export function getConfiguration() {
    return configuration;
}