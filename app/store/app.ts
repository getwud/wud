/**
 * App store.
 */
import logger from '../log';
import { migrate } from './migrate';
import { getVersion } from '../configuration';

const log = logger.child({ component: 'store' });

let app: Collection<AppInfo>;


function saveAppInfosAndMigrate() {
    const appInfosCurrent = {
        name: 'wud',
        version: getVersion(),
    };
    const appInfosSaved = app.findOne({});
    const versionFromStore = appInfosSaved ? appInfosSaved.version : undefined;
    const currentVersion = appInfosCurrent.version;
    if (currentVersion !== versionFromStore) {
        migrate(versionFromStore, currentVersion);
    }
    if (appInfosSaved) {
        app.remove(appInfosSaved);
    }
    app.insert(appInfosCurrent);
}

export function createCollections(db: Loki) {
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

export interface AppInfo {
    name: string;
    version: string;
}
