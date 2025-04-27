import { Counter, register } from 'prom-client';

let triggerCounter: Counter;
let name = 'wud_trigger_count';

export function init() {
    // Replace counter if init is called more than once
    if (triggerCounter) {
        register.removeSingleMetric(name);
    }
    triggerCounter = new Counter({
        name: name,
        help: 'Total count of trigger events',
        labelNames: ['type', 'name', 'status'],
    });
}

export function getTriggerCounter() {
    return triggerCounter;
}