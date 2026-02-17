// @ts-nocheck
import * as prometheus from './index';
import * as configuration from '../configuration';

// Mock configuration
jest.mock('../configuration', () => ({
    getPrometheusConfiguration: jest.fn(() => ({ enabled: true })),
}));

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
    beforeEach(() => {
        jest.clearAllMocks();
        configuration.getPrometheusConfiguration.mockReturnValue({
            enabled: true,
        });
    });

    test('should initialize all prometheus components when enabled', async () => {
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

    test('should NOT initialize metrics when disabled', async () => {
        configuration.getPrometheusConfiguration.mockReturnValue({
            enabled: false,
        });
        const { collectDefaultMetrics } = await import('prom-client');
        const container = await import('./container');
        const trigger = await import('./trigger');
        const watcher = await import('./watcher');
        const registry = await import('./registry');

        prometheus.init();

        expect(collectDefaultMetrics).not.toHaveBeenCalled();
        expect(container.init).not.toHaveBeenCalled();
        expect(registry.init).not.toHaveBeenCalled();
        expect(trigger.init).not.toHaveBeenCalled();
        expect(watcher.init).not.toHaveBeenCalled();
    });

    test('should return metrics output', async () => {
        const { register } = await import('prom-client');

        const output = await prometheus.output();

        expect(register.metrics).toHaveBeenCalled();
        expect(output).toBe('mocked_metrics_output');
    });
});
