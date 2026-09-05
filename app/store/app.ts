import { desc } from 'drizzle-orm';
import logger from '../log';
import * as migrate from './migrate';
import { getVersion } from '../configuration';
import * as schema from './db/schema';
import { getDb } from './db';

const log = logger.child({ component: 'store-app' });
const { migrate: migrateData } = migrate;

export function saveAppInfosAndMigrate() {
    const db = getDb();
    const currentVersion = getVersion();
    const appInfosCurrent = {
        name: 'wud',
        version: currentVersion,
    };

    const appInfosSaved = db
        .select()
        .from(schema.appInfo)
        .orderBy(desc(schema.appInfo.id))
        .limit(1)
        .get();

    const versionFromStore = appInfosSaved ? appInfosSaved.version : undefined;
    if (currentVersion !== versionFromStore) {
        migrateData(versionFromStore, currentVersion);
    }

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
        .orderBy(desc(schema.appInfo.id))
        .limit(1)
        .get();

    return info ? { name: info.name, version: info.version } : undefined;
}
