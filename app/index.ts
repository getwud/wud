import { getVersion } from './configuration';
import logger from './log';
import { store } from './store';
import * as registry from './registry';
import * as api from './api';
import * as prometheus from './prometheus';

const log = logger.child({ component: 'app' });

async function main() {
    log.info(`WUD is starting (version = ${getVersion()})`);

    // Init store
    await store.init();

    // Start Prometheus registry
    prometheus.init();

    // Init registry
    await registry.init();

    // Init api
    await api.init();
}
main();
