import logger from '../log';
import { getVersion } from '../configuration';
import * as schema from './db/schema';
import { getDb } from './db';

const log = logger.child({ component: 'store-app' });

export function saveAppInfosAndMigrate() {
    const db = getDb();
    const currentVersion = getVersion();
    const appInfosCurrent = {
        name: 'wud',
        version: currentVersion,
    };

    db.insert(schema.appInfo).values(appInfosCurrent).run();
}

export function createCollections() {
    log.debug('Using SQLite store: app_info collection initialized');
    saveAppInfosAndMigrate();
}

export function getAppInfos() {
    const db = getDb();
    const info = db
        .select()
        .from(schema.appInfo)
        .orderBy(schema.appInfo.id)
        .limit(1)
        .get();

    return info ? { name: info.name, version: info.version } : undefined;
}
