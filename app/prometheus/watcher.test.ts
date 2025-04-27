const watcher = require('./watcher');

test('watcher counter should be properly configured', () => {
    watcher.init();
    const gauge = watcher.getWatchContainerGauge();
    expect(gauge.name).toStrictEqual('wud_watcher_total');
    expect(gauge.labelNames).toStrictEqual(['type', 'name']);
});
