import * as configuration from './index';

test('getVersion should return wud version', () => {
    configuration.wudEnvVars.WUD_VERSION = 'x.y.z';
    expect(configuration.getVersion()).toStrictEqual('x.y.z');
});

test('getLogLevel should return info by default', () => {
    delete configuration.wudEnvVars.WUD_LOG_LEVEL;
    expect(configuration.getLogLevel()).toStrictEqual('info');
});

test('getLogLevel should return debug when overridden', () => {
    configuration.wudEnvVars.WUD_LOG_LEVEL = 'debug';
    expect(configuration.getLogLevel()).toStrictEqual('debug');
});

test('getWatcherConfiguration should return empty object by default', () => {
    delete configuration.wudEnvVars.WUD_WATCHER_WATCHER1_X;
    delete configuration.wudEnvVars.WUD_WATCHER_WATCHER1_Y;
    delete configuration.wudEnvVars.WUD_WATCHER_WATCHER2_X;
    delete configuration.wudEnvVars.WUD_WATCHER_WATCHER2_Y;
    expect(configuration.getWatcherConfigurations()).toStrictEqual({});
});

test('getWatcherConfiguration should return configured watchers when overridden', () => {
    configuration.wudEnvVars.WUD_WATCHER_WATCHER1_X = 'x';
    configuration.wudEnvVars.WUD_WATCHER_WATCHER1_Y = 'y';
    configuration.wudEnvVars.WUD_WATCHER_WATCHER2_X = 'x';
    configuration.wudEnvVars.WUD_WATCHER_WATCHER2_Y = 'y';
    expect(configuration.getWatcherConfigurations()).toStrictEqual({
        watcher1: { x: 'x', y: 'y' },
        watcher2: { x: 'x', y: 'y' },
    });
});

test('getTriggerConfigurations should return empty object by default', () => {
    delete configuration.wudEnvVars.WUD_TRIGGER_TRIGGER1_X;
    delete configuration.wudEnvVars.WUD_TRIGGER_TRIGGER1_Y;
    delete configuration.wudEnvVars.WUD_TRIGGER_TRIGGER2_X;
    delete configuration.wudEnvVars.WUD_TRIGGER_TRIGGER2_Y;
    expect(configuration.getTriggerConfigurations()).toStrictEqual({});
});

test('getTriggerConfigurations should return configured triggers when overridden', () => {
    configuration.wudEnvVars.WUD_TRIGGER_TRIGGER1_X = 'x';
    configuration.wudEnvVars.WUD_TRIGGER_TRIGGER1_Y = 'y';
    configuration.wudEnvVars.WUD_TRIGGER_TRIGGER2_X = 'x';
    configuration.wudEnvVars.WUD_TRIGGER_TRIGGER2_Y = 'y';
    expect(configuration.getTriggerConfigurations()).toStrictEqual({
        trigger1: { x: 'x', y: 'y' },
        trigger2: { x: 'x', y: 'y' },
    });
});

test('getRegistryConfigurations should return empty object by default', () => {
    delete configuration.wudEnvVars.WUD_REGISTRY_REGISTRY1_X;
    delete configuration.wudEnvVars.WUD_REGISTRY_REGISTRY1_Y;
    delete configuration.wudEnvVars.WUD_REGISTRY_REGISTRY1_X;
    delete configuration.wudEnvVars.WUD_REGISTRY_REGISTRY1_Y;
    expect(configuration.getRegistryConfigurations()).toStrictEqual({});
});

test('getRegistryConfigurations should return configured registries when overridden', () => {
    configuration.wudEnvVars.WUD_REGISTRY_REGISTRY1_X = 'x';
    configuration.wudEnvVars.WUD_REGISTRY_REGISTRY1_Y = 'y';
    configuration.wudEnvVars.WUD_REGISTRY_REGISTRY2_X = 'x';
    configuration.wudEnvVars.WUD_REGISTRY_REGISTRY2_Y = 'y';
    expect(configuration.getRegistryConfigurations()).toStrictEqual({
        registry1: { x: 'x', y: 'y' },
        registry2: { x: 'x', y: 'y' },
    });
});

test('getStoreConfiguration should return configured store', () => {
    configuration.wudEnvVars.WUD_STORE_X = 'x';
    configuration.wudEnvVars.WUD_STORE_Y = 'y';
    expect(configuration.getStoreConfiguration()).toStrictEqual({
        x: 'x',
        y: 'y',
    });
});

test('getServerConfiguration should return configured api (new vars)', () => {
    configuration.wudEnvVars.WUD_SERVER_PORT = '4000';
    expect(configuration.getServerConfiguration()).toStrictEqual({
        cors: {},
        enabled: true,
        feature: {
            delete: true,
        },
        port: 4000,
        tls: {},
    });
});

test('replaceSecrets must read secret in file', () => {
    const vars = {
        WUD_SERVER_X__FILE: `${__dirname}/secret.txt`,
    };
    configuration.replaceSecrets(vars);
    expect(vars).toStrictEqual({
        WUD_SERVER_X: 'super_secret',
    });
});
