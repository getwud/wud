import { collectDefaultMetrics, register } from 'prom-client';

import logger from '../log';
import * as container from './container';
import * as trigger from './trigger';
import * as watcher from './watcher';
import * as registry from './registry';

const log = logger.child({ component: 'prometheus' });
/**
 * Start the Prometheus registry.
 */
export function init() {
    log.info('Init Prometheus module');
    collectDefaultMetrics();
    container.init();
    registry.init();
    trigger.init();
    watcher.init();
}

/**
 * Return all metrics as string for Prometheus scrapping.
 */
export async function output() {
    return register.metrics();
}

