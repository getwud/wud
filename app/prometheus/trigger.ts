// @ts-nocheck
import { Counter, register } from 'prom-client';

let triggerCounter;

export function init() {
    // Replace counter if init is called more than once
    if (triggerCounter) {
        register.removeSingleMetric(triggerCounter.name);
    }
    triggerCounter = new Counter({
        name: 'wud_trigger_count',
        help: 'Total count of trigger events',
        labelNames: ['type', 'name', 'status'],
    });
}

export function getTriggerCounter() {
    return triggerCounter;
}
