// @ts-nocheck
import * as configuration from '../configuration';
import Component from './Component';
import * as prometheusWatcher from '../prometheus/watcher';

jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'info'),
    getRegistryConfigurations: jest.fn(),
    getTriggerConfigurations: jest.fn(),
    getWatcherConfigurations: jest.fn(),
    getAuthenticationConfigurations: jest.fn(),
}));

let registries = {};
let triggers = {};
let watchers = {};
let authentications = {};

// Override the mocked functions
// We need to cast to jest.Mock or assume they are mocks because of the factory above
const mockGetRegistryConfigurations = configuration.getRegistryConfigurations;
const mockGetTriggerConfigurations = configuration.getTriggerConfigurations;
const mockGetWatcherConfigurations = configuration.getWatcherConfigurations;
const mockGetAuthenticationConfigurations =
    configuration.getAuthenticationConfigurations;

mockGetRegistryConfigurations.mockImplementation(() => registries);
mockGetTriggerConfigurations.mockImplementation(() => triggers);
mockGetWatcherConfigurations.mockImplementation(() => watchers);
mockGetAuthenticationConfigurations.mockImplementation(() => authentications);

import * as registry from './index';

beforeEach(async () => {
    jest.clearAllMocks();
    prometheusWatcher.init();
    registries = {};
    triggers = {};
    watchers = {};
    authentications = {};

    // Ensure default implementations return the variables
    mockGetRegistryConfigurations.mockImplementation(() => registries);
    mockGetTriggerConfigurations.mockImplementation(() => triggers);
    mockGetWatcherConfigurations.mockImplementation(() => watchers);
    mockGetAuthenticationConfigurations.mockImplementation(
        () => authentications,
    );
});

afterEach(async () => {
    try {
        await registry.testable_deregisterRegistries();
        await registry.testable_deregisterTriggers();
        await registry.testable_deregisterWatchers();
        await registry.testable_deregisterAuthentications();
    } catch (e) {
        // ignore error
    }
});

test('registerComponent should warn when component does not exist', async () => {
    const registerComponent = registry.testable_registerComponent;
    expect(
        registerComponent('kind', 'provider', 'name', {}, 'path'),
    ).rejects.toThrow(/Unknown kind provider/);
});

test('registerComponents should return empty array if not components', async () => {
    const registerComponents = registry.testable_registerComponents;
    expect(registerComponents('kind', undefined, 'path')).resolves.toEqual([]);
});

test('deregisterComponent should throw when component fails to deregister', async () => {
    const deregisterComponent = registry.testable_deregisterComponent;
    const component = new Component();
    component.deregister = () => {
        throw new Error('Error x');
    };
    expect(deregisterComponent(component)).rejects.toThrowError(
        'Error when deregistering component .',
    );
});

test('registerRegistries should register all registries', async () => {
    registries = {
        hub: {
            private: {
                login: 'login',
                token: 'token',
            },
        },
        ecr: {
            private: {
                accesskeyid: 'key',
                secretaccesskey: 'secret',
                region: 'region',
            },
        },
    };
    await registry.testable_registerRegistries();
    expect(Object.keys(registry.getState().registry).sort()).toEqual([
        'codeberg.public',
        'ecr.private',
        'gcr.public',
        'ghcr.public',
        'hub.private',
        'quay.public',
    ]);
});

test('registerRegistries should register all anonymous registries by default', async () => {
    await registry.testable_registerRegistries();
    expect(Object.keys(registry.getState().registry).sort()).toEqual([
        'codeberg.public',
        'ecr.public',
        'gcr.public',
        'ghcr.public',
        'hub.public',
        'quay.public',
    ]);
});

test('registerRegistries should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.testable_log, 'warn');
    registries = {
        hub: {
            private: {
                login: false,
            },
        },
    };
    await registry.testable_registerRegistries();
    expect(spyLog).toHaveBeenCalledWith(
        'Some registries failed to register (Error when registering component hub ("login" must be a string))',
    );
});

test('registerTriggers should register all triggers', async () => {
    triggers = {
        mock: {
            mock1: {},
            mock2: {},
        },
    };
    await registry.testable_registerTriggers();
    expect(Object.keys(registry.getState().trigger)).toEqual([
        'mock.mock1',
        'mock.mock2',
    ]);
});

test('registerTriggers should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.testable_log, 'warn');
    triggers = {
        trigger1: {
            fail: true,
        },
    };
    await registry.testable_registerTriggers();
    expect(spyLog).toHaveBeenCalledWith(
        expect.stringContaining(
            "Some triggers failed to register (Unknown trigger provider: 'trigger1'",
        ),
    );
});

test('registerWatchers should register all watchers', async () => {
    watchers = {
        watcher1: {
            host: 'host1',
        },
        watcher2: {
            host: 'host2',
        },
    };
    await registry.testable_registerWatchers();
    expect(Object.keys(registry.getState().watcher)).toEqual([
        'docker.watcher1',
        'docker.watcher2',
    ]);
});

test('registerWatchers should register local docker watcher by default', async () => {
    await registry.testable_registerWatchers();
    expect(Object.keys(registry.getState().watcher)).toEqual(['docker.local']);
});

test('registerWatchers should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.testable_log, 'warn');
    watchers = {
        watcher1: {
            fail: true,
        },
    };
    await registry.testable_registerWatchers();
    expect(spyLog).toHaveBeenCalledWith(
        'Some watchers failed to register (Error when registering component docker ("fail" is not allowed))',
    );
});

test('registerAuthentications should register all auth strategies', async () => {
    authentications = {
        basic: {
            john: {
                user: 'john',
                hash: 'hash',
            },
            jane: {
                user: 'jane',
                hash: 'hash',
            },
        },
    };
    await registry.testable_registerAuthentications();
    expect(Object.keys(registry.getState().authentication)).toEqual([
        'basic.john',
        'basic.jane',
    ]);
});

test('registerAuthentications should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.testable_log, 'warn');
    authentications = {
        basic: {
            john: {
                fail: true,
            },
        },
    };
    await registry.testable_registerAuthentications();
    expect(spyLog).toHaveBeenCalledWith(
        'Some authentications failed to register (Error when registering component basic ("user" is required))',
    );
});

test('registerAuthentications should register anonymous auth by default', async () => {
    await registry.testable_registerAuthentications();
    expect(Object.keys(registry.getState().authentication)).toEqual([
        'anonymous.anonymous',
    ]);
});

test('init should register all components', async () => {
    registries = {
        hub: {
            private: {
                login: 'login',
                token: 'token',
            },
        },
        ecr: {
            private: {
                accesskeyid: 'key',
                secretaccesskey: 'secret',
                region: 'region',
            },
        },
    };
    triggers = {
        mock: {
            mock1: {},
            mock2: {},
        },
    };
    watchers = {
        watcher1: {
            host: 'host1',
        },
        watcher2: {
            host: 'host2',
        },
    };
    authentications = {
        basic: {
            john: {
                user: 'john',
                hash: 'hash',
            },
            jane: {
                user: 'jane',
                hash: 'hash',
            },
        },
    };
    await registry.init();
    expect(Object.keys(registry.getState().registry).sort()).toEqual([
        'codeberg.public',
        'ecr.private',
        'gcr.public',
        'ghcr.public',
        'hub.private',
        'quay.public',
    ]);
    expect(Object.keys(registry.getState().trigger)).toEqual([
        'mock.mock1',
        'mock.mock2',
    ]);
    expect(Object.keys(registry.getState().watcher)).toEqual([
        'docker.watcher1',
        'docker.watcher2',
    ]);
    expect(Object.keys(registry.getState().authentication)).toEqual([
        'basic.john',
        'basic.jane',
    ]);
});

test('deregisterAll should deregister all components', async () => {
    registries = {
        hub: {
            login: 'login',
            token: 'token',
        },
        ecr: {
            accesskeyid: 'key',
            secretaccesskey: 'secret',
            region: 'region',
        },
    };
    triggers = {
        mock: {
            mock1: {},
            mock2: {},
        },
    };
    watchers = {
        watcher1: {
            host: 'host1',
        },
        watcher2: {
            host: 'host2',
        },
    };
    authentications = {
        basic: {
            john: {
                user: 'john',
                hash: 'hash',
            },
            jane: {
                user: 'jane',
                hash: 'hash',
            },
        },
    };
    await registry.init();
    await registry.testable_deregisterAll();
    expect(Object.keys(registry.getState().registry).length).toEqual(0);
    expect(Object.keys(registry.getState().trigger).length).toEqual(0);
    expect(Object.keys(registry.getState().watcher).length).toEqual(0);
    expect(Object.keys(registry.getState().authentication).length).toEqual(0);
});

test('deregisterAll should throw an error when any component fails to deregister', async () => {
    const component = new Component();
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    registry.getState().trigger = {
        trigger1: component,
    };
    expect(registry.testable_deregisterAll()).rejects.toThrowError(
        'Error when deregistering component .',
    );
});

test('deregisterRegistries should throw when errors occurred', async () => {
    const component = new Component();
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    registry.getState().registry = {
        registry1: component,
    };
    expect(registry.testable_deregisterRegistries()).rejects.toThrowError(
        'Error when deregistering component .',
    );
});

test('deregisterTriggers should throw when errors occurred', async () => {
    const component = new Component();
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    registry.getState().trigger = {
        trigger1: component,
    };
    expect(registry.testable_deregisterTriggers()).rejects.toThrowError(
        'Error when deregistering component .',
    );
});

test('deregisterWatchers should throw when errors occurred', async () => {
    const component = new Component();
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    registry.getState().watcher = {
        watcher1: component,
    };
    expect(registry.testable_deregisterWatchers()).rejects.toThrowError(
        'Error when deregistering component .',
    );
});
