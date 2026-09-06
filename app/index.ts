// @ts-nocheck
import { getVersion } from './configuration';
import log from './log';
import { store } from './store';
import * as registry from './registry';
import * as api from './api';
import * as prometheus from './prometheus';
import { bootstrapAuth } from './store/auth_bootstrap';

async function main() {
    log.info(`WUD is starting (version = ${getVersion()})`);

    // Init store
    await store.init();

    // Bootstrap authentication
    await bootstrapAuth();

    // Start Prometheus registry
    prometheus.init();

    // Init registry
    await registry.init();

    // Init api
    await api.init();
}
main();
