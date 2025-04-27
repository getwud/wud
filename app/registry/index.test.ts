let registries = {};
let triggers = {};
let watchers = {};
let authentications = {};

jest.mock('../configuration', () => {
    const originalModule = jest.requireActual('../configuration');
    return {
        ...originalModule,
        getLogLevel: jest.fn(() => 'info'),
        getRegistryConfigurations: jest.fn(() => registries),
        getTriggerConfigurations: jest.fn(() => triggers),
        getWatcherConfigurations: jest.fn(() => watchers),
        getAuthenticationConfigurations: jest.fn(() => authentications),
    };
});

import { Component } from './Component';
import * as prometheusWatcher from '../prometheus/watcher';

import * as registry from './index';
import { getState } from './states';
import { Trigger } from '../triggers/providers/Trigger';
import { Registry } from '../registries/Registry';
import { Watcher } from '../watchers/Watcher';

beforeEach(() => {
    prometheusWatcher.init();
    registries = {};
    triggers = {};
    watchers = {};
    authentications = {};
});

afterEach(async () => {
    try {
        await registry.deregisterRegistries();
        await registry.deregisterTriggers();
        await registry.deregisterWatchers();
        await registry.deregisterAuthentications();
    } catch (e) {
        // ignore error
    }
});

test('registerComponents should return empty array if not components', () => {
    expect(registry.registerComponents('trigger', {}, '')).resolves.toEqual([]);
});

test('deregisterComponent should throw when component fails to deregister', () => {
    const component = new Component();
    component.deregister = () => {
        throw new Error('Error x');
    };
    expect(registry.deregisterComponent(component, 'trigger')).rejects.toThrowError(
        'Error when deregistering component undefined.undefined',
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
    await registry.registerRegistries();
    expect(Object.keys(getState().registry).sort()).toEqual([
        'ecr.private',
        'gcr.public',
        'ghcr.public',
        'hub.private',
        'quay.public',
    ]);
});

test('registerRegistries should register all anonymous registries by default', async () => {
    await registry.registerRegistries();
    expect(Object.keys(getState().registry).sort()).toEqual([
        'ecr.public',
        'gcr.public',
        'ghcr.public',
        'hub.public',
        'quay.public',
    ]);
});

test('registerRegistries should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.log, 'warn');
    registries = {
        hub: {
            private: {
                login: false,
            },
        },
    };
    await registry.registerRegistries();
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
    await registry.registerTriggers();
    expect(Object.keys(getState().trigger)).toEqual([
        'mock.mock1',
        'mock.mock2',
    ]);
});

test('registerTriggers should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.log, 'warn');
    triggers = {
        trigger1: {
            fail: true,
        },
    };
    await registry.registerTriggers();
    expect(spyLog).toHaveBeenCalledWith(
        "Some triggers failed to register (Error when registering component trigger1 (Cannot find module '../triggers/providers/trigger1/Trigger1' from 'registry/index.ts'))",
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
    await registry.registerWatchers();
    expect(Object.keys(getState().watcher)).toEqual([
        'docker.watcher1',
        'docker.watcher2',
    ]);
});

test('registerWatchers should register local docker watcher by default', async () => {
    await registry.registerWatchers();
    expect(Object.keys(getState().watcher)).toEqual(['docker.local']);
});

test('registerWatchers should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.log, 'warn');
    watchers = {
        watcher1: {
            fail: true,
        },
    };
    await registry.registerWatchers();
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
    await registry.registerAuthentications();
    expect(Object.keys(getState().authentication)).toEqual([
        'basic.john',
        'basic.jane',
    ]);
});

test('registerAuthentications should warn when registration errors occur', async () => {
    const spyLog = jest.spyOn(registry.log, 'warn');
    authentications = {
        basic: {
            john: {
                fail: true,
            },
        },
    };
    await registry.registerAuthentications();
    expect(spyLog).toHaveBeenCalledWith(
        'Some authentications failed to register (Error when registering component basic ("user" is required))',
    );
});

test('registerAuthentications should register anonymous auth by default', async () => {
    await registry.registerAuthentications();
    expect(Object.keys(getState().authentication)).toEqual([
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
    expect(Object.keys(getState().registry).sort()).toEqual([
        'ecr.private',
        'gcr.public',
        'ghcr.public',
        'hub.private',
        'quay.public',
    ]);
    expect(Object.keys(getState().trigger)).toEqual([
        'mock.mock1',
        'mock.mock2',
    ]);
    expect(Object.keys(getState().watcher)).toEqual([
        'docker.watcher1',
        'docker.watcher2',
    ]);
    expect(Object.keys(getState().authentication)).toEqual([
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
    await registry.deregisterAll();
    expect(Object.keys(getState().registry).length).toEqual(0);
    expect(Object.keys(getState().trigger).length).toEqual(0);
    expect(Object.keys(getState().watcher).length).toEqual(0);
    expect(Object.keys(getState().authentication).length).toEqual(0);
});

test('deregisterAll should throw an error when any component fails to deregister', () => {
    const component = new Component() as Trigger;
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    getState().trigger = {
        'trigger1': component,
    };
    expect(registry.deregisterAll()).rejects.toThrowError(
        'Error when deregistering component undefined.undefined',
    );
});

test('deregisterRegistries should throw when errors occurred', async () => {
    const component = new Component() as Registry;
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    getState().registry = {
        registry1: component,
    };
    expect(registry.deregisterRegistries()).rejects.toThrowError(
        'Error when deregistering component undefined.undefined',
    );
});

test('deregisterTriggers should throw when errors occurred', async () => {
    const component = new Component() as Trigger;
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    getState().trigger = {
        trigger1: component,
    };
    expect(registry.deregisterTriggers()).rejects.toThrowError(
        'Error when deregistering component undefined.undefined',
    );
});

test('deregisterWatchers should throw when errors occurred', async () => {
    const component = new Component() as Watcher;
    component.deregister = () => {
        throw new Error('Fail!!!');
    };
    getState().watcher = {
        watcher1: component,
    };
    expect(registry.deregisterWatchers()).rejects.toThrowError(
        'Error when deregistering component undefined.undefined',
    );
});
