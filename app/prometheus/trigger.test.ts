// @ts-nocheck
import * as trigger from './trigger';

test('trigger counter should be properly configured', async () => {
    trigger.init();
    const summary = trigger.getTriggerCounter();
    expect(summary.name).toStrictEqual('wud_trigger_count');
    expect(summary.labelNames).toStrictEqual(['type', 'name', 'status']);
});
