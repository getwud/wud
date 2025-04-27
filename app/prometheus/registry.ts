import { Summary, register } from 'prom-client';

let summaryGetTags: Summary | null = null;
const name = 'wud_registry_response'
export function init() {
    // Replace summary if init is called more than once
    if (summaryGetTags) {
        register.removeSingleMetric(name);
    }
    summaryGetTags = new Summary({
        name: name,
        help: 'The Registry response time (in second)',
        labelNames: ['type', 'name'],
    });
}

export function getSummaryTags() {
    return summaryGetTags!;
}