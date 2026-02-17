// @ts-nocheck
import { collectDefaultMetrics, register } from 'prom-client';

import logger from '../log';
const log = logger.child({ component: 'prometheus' });
import * as configuration from '../configuration';
import * as container from './container';
import * as trigger from './trigger';
import * as watcher from './watcher';
import * as registry from './registry';

/**
 * Start the Prometheus registry.
 */
export function init() {
    const prometheusConfiguration = configuration.getPrometheusConfiguration();
    if (!prometheusConfiguration.enabled) {
        log.info('Prometheus monitoring disabled');
        return;
    }
    log.info('Init Prometheus module');
    collectDefaultMetrics();
    container.init();
    registry.init();
    trigger.init();
    watcher.init();
}

/**
 * Return all metrics as string for Prometheus scrapping.
 * @returns {string}
 */
export async function output() {
    return register.metrics();
}
