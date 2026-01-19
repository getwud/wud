// @ts-nocheck
import * as prometheus from './index';

// Mock prom-client
jest.mock('prom-client', () => ({
    collectDefaultMetrics: jest.fn(),
    register: {
        metrics: jest.fn(() => 'mocked_metrics_output'),
    },
}));

// Mock child modules
jest.mock('./container', () => ({
    init: jest.fn(),
}));

jest.mock('./trigger', () => ({
    init: jest.fn(),
}));

jest.mock('./watcher', () => ({
    init: jest.fn(),
}));

jest.mock('./registry', () => ({
    init: jest.fn(),
}));

// Mock log
jest.mock('../log', () => ({
    child: jest.fn(() => ({
        info: jest.fn(),
    })),
}));

describe('Prometheus Module', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('should initialize all prometheus components', async () => {
        const { collectDefaultMetrics } = await import('prom-client');
        const container = await import('./container');
        const trigger = await import('./trigger');
        const watcher = await import('./watcher');
        const registry = await import('./registry');

        prometheus.init();

        expect(collectDefaultMetrics).toHaveBeenCalled();
        expect(container.init).toHaveBeenCalled();
        expect(registry.init).toHaveBeenCalled();
        expect(trigger.init).toHaveBeenCalled();
        expect(watcher.init).toHaveBeenCalled();
    });

    test('should return metrics output', async () => {
        const { register } = await import('prom-client');

        const output = await prometheus.output();

        expect(register.metrics).toHaveBeenCalled();
        expect(output).toBe('mocked_metrics_output');
    });
});
