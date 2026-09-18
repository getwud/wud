import log from './index';

// Mock the configuration module
jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'info'),
}));

describe('Logger', () => {
    test('should export a pino logger instance', async () => {
        expect(log).toBeDefined();
        expect(typeof log.info).toBe('function');
        expect(typeof log.warn).toBe('function');
        expect(typeof log.error).toBe('function');
        expect(typeof log.debug).toBe('function');
    });

    test('should have correct logger name', async () => {
        expect(log.bindings().name).toBe('wud');
    });

    test('should have correct log level', async () => {
        expect(log.level).toBe('info');
    });

    test('should not write debug logs when log level is info', () => {
        const stdoutSpy = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation(() => true);
        try {
            log.debug('test dropped debug message');
            expect(stdoutSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('test dropped debug message'),
            );
        } finally {
            stdoutSpy.mockRestore();
        }
    });

    describe('when log level is debug', () => {
        let stdoutSpy: jest.SpyInstance;

        beforeEach(() => {
            stdoutSpy = jest
                .spyOn(process.stdout, 'write')
                .mockImplementation(() => true);
        });

        afterEach(() => {
            stdoutSpy.mockRestore();
        });

        test('should write debug logs to streams and memoryStream when log level is debug', () => {
            let debugLog: typeof log;
            let debugLogHistory: typeof import('./index').logHistory;

            const configuration = require('../configuration');
            jest.spyOn(configuration, 'getLogLevel').mockReturnValue('debug');

            jest.isolateModules(() => {
                const logModule = require('./index');
                debugLog = logModule.default;
                debugLogHistory = logModule.logHistory;
            });

            debugLog.debug('test debug message');
            expect(stdoutSpy).toHaveBeenCalledWith(
                expect.stringContaining('test debug message'),
            );
            expect(debugLogHistory).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'test debug message',
                    }),
                ]),
            );
        });
    });

    describe('when log level is trace', () => {
        let stdoutSpy: jest.SpyInstance;

        beforeEach(() => {
            stdoutSpy = jest
                .spyOn(process.stdout, 'write')
                .mockImplementation(() => true);
        });

        afterEach(() => {
            stdoutSpy.mockRestore();
        });

        test('should write trace logs to streams and memoryStream when log level is trace', () => {
            let traceLog: typeof log;
            let traceLogHistory: typeof import('./index').logHistory;

            const configuration = require('../configuration');
            jest.spyOn(configuration, 'getLogLevel').mockReturnValue('trace');

            jest.isolateModules(() => {
                const logModule = require('./index');
                traceLog = logModule.default;
                traceLogHistory = logModule.logHistory;
            });

            traceLog.trace('test trace message');
            expect(stdoutSpy).toHaveBeenCalledWith(
                expect.stringContaining('test trace message'),
            );
            expect(traceLogHistory).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'test trace message',
                    }),
                ]),
            );
        });
    });
});
