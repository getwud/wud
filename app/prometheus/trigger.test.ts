const trigger = require('./trigger');

test('trigger counter should be properly configured', () => {
    trigger.init();
    const summary = trigger.getTriggerCounter();
    expect(summary.name).toStrictEqual('wud_trigger_count');
    expect(summary.labelNames).toStrictEqual(['type', 'name', 'status']);
});
