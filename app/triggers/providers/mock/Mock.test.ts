// @ts-nocheck
import Mock from './Mock';

describe('Mock Trigger', () => {
    let mock;

    beforeEach(async () => {
        mock = new Mock();
        await mock.register('trigger', 'mock', 'test', {});
    });

    test('should create instance', async () => {
        expect(mock).toBeDefined();
        expect(mock).toBeInstanceOf(Mock);
    });

    test('should have correct configuration schema', async () => {
        const schema = mock.getConfigurationSchema();
        expect(schema).toBeDefined();
    });

    test('should validate configuration with default mock value', async () => {
        const config = {};
        expect(() => mock.validateConfiguration(config)).not.toThrow();
        const validated = mock.validateConfiguration(config);
        expect(validated.mock).toBe('mock');
    });

    test('should validate configuration with custom mock value', async () => {
        const config = { mock: 'custom' };
        const validated = mock.validateConfiguration(config);
        expect(validated.mock).toBe('custom');
    });

    test('should trigger with container', async () => {
        const logSpy = jest.spyOn(mock.log, 'info');
        const container = {
            name: 'test-container',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '1.1.0',
            },
        };

        await mock.trigger(container);

        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('MOCK triggered title'),
        );
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('MOCK triggered body'),
        );
    });

    test('should trigger batch with containers', async () => {
        const logSpy = jest.spyOn(mock.log, 'info');
        const containers = [
            {
                name: 'test1',
                updateKind: {
                    kind: 'tag',
                    localValue: '1.0.0',
                    remoteValue: '1.1.0',
                },
            },
            {
                name: 'test2',
                updateKind: {
                    kind: 'tag',
                    localValue: '2.0.0',
                    remoteValue: '2.1.0',
                },
            },
        ];

        await mock.triggerBatch(containers);

        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('MOCK triggered title'),
        );
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('MOCK triggered body'),
        );
    });
});
