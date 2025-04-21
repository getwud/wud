import { Gauge, register } from 'prom-client';

let watchContainerGauge: Gauge | null = null;
const name = 'wud_watcher_total';

export function init() {
    // Replace gauge if init is called more than once
    if (watchContainerGauge) {
        register.removeSingleMetric(name);
    }
    watchContainerGauge = new Gauge({
        name: name,
        help: 'The number of watched containers',
        labelNames: ['type', 'name'],
    });
}

export function getWatchContainerGauge() {
    return watchContainerGauge;
}
