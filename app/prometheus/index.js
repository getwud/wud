const { collectDefaultMetrics, register } = require('prom-client');

const log = require('../log').child({ component: 'prometheus' });
const configuration = require('../configuration');
const container = require('./container');
const trigger = require('./trigger');
const watcher = require('./watcher');
const registry = require('./registry');

/**
 * Start the Prometheus registry.
 */
function init() {
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
async function output() {
    return register.metrics();
}

module.exports = {
    init,
    output,
};
