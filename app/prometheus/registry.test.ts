const registry = require('./registry');

test('registry histogram should be properly configured', () => {
    registry.init();
    const summary = registry.getSummaryTags();
    expect(summary.name).toStrictEqual('wud_registry_response');
    expect(summary.labelNames).toStrictEqual(['type', 'name']);
});
