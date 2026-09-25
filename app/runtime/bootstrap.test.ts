// @ts-nocheck
import { bootstrap } from './bootstrap';

jest.mock('../store', () => ({
    store: {
        init: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../store/auth_bootstrap', () => ({
    bootstrapAuth: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../prometheus', () => ({
    init: jest.fn(),
}));

jest.mock('../registry', () => ({
    init: jest.fn().mockResolvedValue(undefined),
    registerComponents: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../api', () => ({
    init: jest.fn().mockResolvedValue(undefined),
}));

let order: string[];

beforeEach(async () => {
    jest.clearAllMocks();
    order = [];

    const store = await import('../store');
    const { bootstrapAuth } = await import('../store/auth_bootstrap');
    const prometheus = await import('../prometheus');
    const registry = await import('../registry');
    const api = await import('../api');

    store.store.init.mockImplementation(async () => {
        order.push('store.init');
    });
    bootstrapAuth.mockImplementation(async () => {
        order.push('bootstrapAuth');
    });
    prometheus.init.mockImplementation(() => {
        order.push('prometheus.init');
    });
    registry.init.mockImplementation(async () => {
        order.push('registry.init');
    });
    registry.registerComponents.mockImplementation(async () => {
        order.push('registry.registerComponents');
    });
    api.init.mockImplementation(async () => {
        order.push('api.init');
    });
});

describe('bootstrap', () => {
    test('server mode should follow the server startup order', async () => {
        const store = await import('../store');
        const { bootstrapAuth } = await import('../store/auth_bootstrap');
        const prometheus = await import('../prometheus');
        const registry = await import('../registry');
        const api = await import('../api');

        await bootstrap({ mode: 'server' });

        expect(order).toEqual([
            'store.init',
            'bootstrapAuth',
            'prometheus.init',
            'registry.init',
            'api.init',
        ]);
        expect(store.store.init).toHaveBeenCalledTimes(1);
        expect(bootstrapAuth).toHaveBeenCalledTimes(1);
        expect(prometheus.init).toHaveBeenCalledTimes(1);
        expect(registry.init).toHaveBeenCalledTimes(1);
        expect(registry.registerComponents).not.toHaveBeenCalled();
        expect(api.init).toHaveBeenCalledTimes(1);
    });

    test('oneshot mode should only register components', async () => {
        const store = await import('../store');
        const { bootstrapAuth } = await import('../store/auth_bootstrap');
        const prometheus = await import('../prometheus');
        const registry = await import('../registry');
        const api = await import('../api');

        await bootstrap({ mode: 'oneshot' });

        expect(registry.registerComponents).toHaveBeenCalledTimes(1);
        expect(store.store.init).not.toHaveBeenCalled();
        expect(bootstrapAuth).not.toHaveBeenCalled();
        expect(prometheus.init).not.toHaveBeenCalled();
        expect(registry.init).not.toHaveBeenCalled();
        expect(api.init).not.toHaveBeenCalled();
    });
});
