// @ts-nocheck
import {
    shutdown,
    registerShutdownHandlers,
    unregisterShutdownHandlers,
    resetShutdownState,
    isShutdownInProgress,
} from './shutdown';

jest.mock('../log', () => {
    const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: () => mockLogger,
    };
    return mockLogger;
});

jest.mock('../api', () => ({
    close: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../registry', () => ({
    deregisterAll: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../store', () => ({
    close: jest.fn(),
}));

describe('shutdown', () => {
    let mockExit: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        resetShutdownState();
        mockExit = jest.fn();
    });

    afterEach(() => {
        resetShutdownState();
        jest.useRealTimers();
    });

    test('should perform orderly shutdown: api.close -> registry.deregisterAll -> store.close -> exit(0)', async () => {
        const api = await import('../api');
        const registry = await import('../registry');
        const store = await import('../store');

        const order: string[] = [];
        (api.close as jest.Mock).mockImplementation(async () => {
            order.push('api.close');
        });
        (registry.deregisterAll as jest.Mock).mockImplementation(async () => {
            order.push('registry.deregisterAll');
        });
        (store.close as jest.Mock).mockImplementation(() => {
            order.push('store.close');
        });

        const shutdownPromise = shutdown('SIGTERM', { exit: mockExit });
        expect(isShutdownInProgress()).toBe(true);

        await shutdownPromise;

        expect(order).toEqual([
            'api.close',
            'registry.deregisterAll',
            'store.close',
        ]);
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('should ignore duplicate shutdown calls while in progress', async () => {
        const api = await import('../api');
        const registry = await import('../registry');
        const store = await import('../store');

        const shutdownPromise1 = shutdown('SIGTERM', { exit: mockExit });
        const shutdownPromise2 = shutdown('SIGINT', { exit: mockExit });

        await Promise.all([shutdownPromise1, shutdownPromise2]);

        expect(api.close).toHaveBeenCalledTimes(1);
        expect(registry.deregisterAll).toHaveBeenCalledTimes(1);
        expect(store.close).toHaveBeenCalledTimes(1);
        expect(mockExit).toHaveBeenCalledTimes(1);
    });

    test('should continue shutdown sequence when individual components throw errors', async () => {
        const api = await import('../api');
        const registry = await import('../registry');
        const store = await import('../store');

        (api.close as jest.Mock).mockRejectedValueOnce(
            new Error('API close failed'),
        );
        (registry.deregisterAll as jest.Mock).mockRejectedValueOnce(
            new Error('Deregister failed'),
        );
        (store.close as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Store close failed');
        });

        await shutdown('SIGTERM', { exit: mockExit });

        expect(api.close).toHaveBeenCalledTimes(1);
        expect(registry.deregisterAll).toHaveBeenCalledTimes(1);
        expect(store.close).toHaveBeenCalledTimes(1);
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('should trigger fallback safety timer and exit(1) if shutdown hangs', async () => {
        const api = await import('../api');

        // Never resolves
        (api.close as jest.Mock).mockImplementation(
            () => new Promise(() => {}),
        );

        shutdown('SIGTERM', { timeoutMs: 5000, exit: mockExit });

        expect(mockExit).not.toHaveBeenCalled();

        // Advance timers past timeout
        jest.advanceTimersByTime(5000);

        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('registerShutdownHandlers should attach SIGTERM and SIGINT listeners to process', () => {
        const processSpy = jest.spyOn(process, 'on');
        registerShutdownHandlers({ exit: mockExit });

        expect(processSpy).toHaveBeenCalledWith(
            'SIGTERM',
            expect.any(Function),
        );
        expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        processSpy.mockRestore();
    });

    test('unregisterShutdownHandlers should remove listeners from process', () => {
        const removeSpy = jest.spyOn(process, 'removeListener');
        registerShutdownHandlers({ exit: mockExit });
        unregisterShutdownHandlers();

        expect(removeSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        removeSpy.mockRestore();
    });

    test('process signals should trigger shutdown', async () => {
        let sigtermCb: (() => void) | undefined;
        const processOnSpy = jest
            .spyOn(process, 'on')
            .mockImplementation((event: string, cb: any) => {
                if (event === 'SIGTERM') {
                    sigtermCb = cb;
                }
                return process;
            });

        registerShutdownHandlers({ exit: mockExit });

        expect(sigtermCb).toBeDefined();
        if (sigtermCb) {
            sigtermCb();
        }

        expect(isShutdownInProgress()).toBe(true);
        processOnSpy.mockRestore();
    });
});
