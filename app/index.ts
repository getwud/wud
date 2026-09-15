// @ts-nocheck
import { getVersion } from './configuration';
import log from './log';
import { store } from './store';
import * as registry from './registry';
import * as api from './api';
import * as prometheus from './prometheus';
import { bootstrapAuth } from './store/auth_bootstrap';
import Dockerode from 'dockerode';
import {
    SelfUpdatePayload,
    readSelfUpdatePayload,
    runSelfUpdate,
} from './triggers/providers/docker/self';

/**
 * Run as a one-shot helper that replaces the WUD container, then exit.
 * The docker trigger starts us this way because WUD cannot stop its own
 * container and still be around to recreate it.
 */
async function runAsSelfUpdateHelper(payload: SelfUpdatePayload) {
    log.info(`WUD self-update helper is starting (version = ${getVersion()})`);
    const dockerApi = new Dockerode({ socketPath: payload.socketPath });
    try {
        await runSelfUpdate(payload, dockerApi, log);
    } catch (e) {
        log.error(`WUD self-update helper failed (${e})`);
        process.exitCode = 1;
    }
}

async function main() {
    const selfUpdatePayload = readSelfUpdatePayload();
    if (selfUpdatePayload) {
        await runAsSelfUpdateHelper(selfUpdatePayload);
        return;
    }

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
