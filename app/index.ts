import { getVersion } from './configuration';
import log from './log';
import * as store from './store';
import * as registry from './registry';
import * as api from './api';
import * as prometheus from './prometheus';

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
