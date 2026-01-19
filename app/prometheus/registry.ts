// @ts-nocheck
import { Summary, register } from 'prom-client';

let summaryGetTags;

export function init() {
    // Replace summary if init is called more than once
    if (summaryGetTags) {
        register.removeSingleMetric(summaryGetTags.name);
    }
    summaryGetTags = new Summary({
        name: 'wud_registry_response',
        help: 'The Registry response time (in second)',
        labelNames: ['type', 'name'],
    });
}

export function getSummaryTags() {
    return summaryGetTags;
}
