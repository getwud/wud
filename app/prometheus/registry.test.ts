// @ts-nocheck
import * as registry from './registry';

test('registry histogram should be properly configured', async () => {
    registry.init();
    const summary = registry.getSummaryTags();
    expect(summary.name).toStrictEqual('wud_registry_response');
    expect(summary.labelNames).toStrictEqual(['type', 'name']);
});
