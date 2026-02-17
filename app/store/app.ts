// @ts-nocheck
/**
 * App store.
 */
import logger from '../log';
const log = logger.child({ component: 'store' });
import * as migrate from './migrate';
const { migrate: migrateData } = migrate;
import { getVersion } from '../configuration';

let app;

function saveAppInfosAndMigrate() {
    const appInfosCurrent = {
        name: 'wud',
        version: getVersion(),
    };
    const appInfosSaved = app.findOne({});
    const versionFromStore = appInfosSaved ? appInfosSaved.version : undefined;
    const currentVersion = appInfosCurrent.version;
    if (currentVersion !== versionFromStore) {
        migrateData(versionFromStore, currentVersion);
    }
    if (appInfosSaved) {
        app.remove(appInfosSaved);
    }
    app.insert(appInfosCurrent);
}

export function createCollections(db) {
    app = db.getCollection('app');
    if (app === null) {
        log.info('Create Collection app');
        app = db.addCollection('app');
    }
    saveAppInfosAndMigrate();
}

export function getAppInfos() {
    return app.findOne({});
}
