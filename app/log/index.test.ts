// @ts-nocheck
import log from './index';

// Mock the configuration module
jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'info'),
}));

describe('Logger', () => {
    test('should export a bunyan logger instance', async () => {
        expect(log).toBeDefined();
        expect(typeof log.info).toBe('function');
        expect(typeof log.warn).toBe('function');
        expect(typeof log.error).toBe('function');
        expect(typeof log.debug).toBe('function');
    });

    test('should have correct logger name', async () => {
        expect(log.fields.name).toBe('whats-up-docker');
    });

    test('should have correct log level', async () => {
        expect(log.level()).toBe(30); // INFO level in bunyan
    });
});
