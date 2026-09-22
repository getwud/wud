// @ts-nocheck
import { getVersion } from './configuration';
import log from './log';
import { bootstrap } from './runtime/bootstrap';
import { getRunMode, isOneshot } from './runtime/mode';
import { exitOneshot, runOneShot } from './runtime/oneshot';
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

    // One-shot headless mode: single scan, JSON output, then exit.
    // exitOneshot flushes stdout before terminating: trigger connections
    // (e.g. MQTT clients) may otherwise keep the event loop alive.
    if (isOneshot()) {
        exitOneshot(await runOneShot(process.argv));
        return;
    }

    log.info(`WUD is starting (version = ${getVersion()})`);

    // Server startup order: store.init -> bootstrapAuth -> prometheus.init
    // -> registry.init -> api.init
    await bootstrap({ mode: getRunMode() });
}
main();
