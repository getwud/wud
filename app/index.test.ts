// @ts-nocheck
// Mock all dependencies
jest.mock('./configuration', () => ({
    getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('./log', () => ({
    info: jest.fn(),
}));

jest.mock('./runtime/bootstrap', () => ({
    bootstrap: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./runtime/mode', () => ({
    getRunMode: jest.fn(() => 'server'),
    isOneshot: jest.fn(() => false),
}));

jest.mock('./runtime/oneshot', () => ({
    runOneShot: jest.fn().mockResolvedValue(0),
    exitOneshot: jest.fn(),
}));

describe('Main Application', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        // Clear the module cache to ensure fresh imports
        jest.resetModules();
    });

    test('should start the server through the bootstrap orchestrator', async () => {
        const { default: log } = await import('./log');
        const { getVersion } = await import('./configuration');
        const { bootstrap } = await import('./runtime/bootstrap');
        const { isOneshot } = await import('./runtime/mode');

        // Import and run the main module
        await import('./index');

        // Wait for async operations to complete
        await new Promise((resolve) => setImmediate(resolve));

        // Server mode: bootstrap is called with mode server
        expect(isOneshot).toHaveBeenCalled();
        expect(bootstrap).toHaveBeenCalledWith({ mode: 'server' });
        expect(log.info).toHaveBeenCalledWith(
            'WUD is starting (version = 1.0.0)',
        );
        expect(getVersion).toHaveBeenCalled();
    });

    test('should run the one-shot mode and exit with its result', async () => {
        const { isOneshot } = await import('./runtime/mode');
        const { runOneShot, exitOneshot } = await import('./runtime/oneshot');
        const { bootstrap } = await import('./runtime/bootstrap');

        isOneshot.mockReturnValue(true);
        runOneShot.mockResolvedValue(1);

        // The one-shot entry receives the raw process argv (program tokens
        // included) so the CLI can adapt to node/binary invocation layouts.
        const rawArgv = process.argv;

        // Import and run the main module
        await import('./index');

        // Wait for async operations to complete
        await new Promise((resolve) => setImmediate(resolve));

        expect(runOneShot).toHaveBeenCalledWith(rawArgv);
        expect(exitOneshot).toHaveBeenCalledWith(1);
        expect(bootstrap).not.toHaveBeenCalled();
    });

    test('should exit 0 for a successful one-shot run', async () => {
        const { isOneshot } = await import('./runtime/mode');
        const { runOneShot, exitOneshot } = await import('./runtime/oneshot');

        isOneshot.mockReturnValue(true);
        runOneShot.mockResolvedValue(0);

        await import('./index');
        await new Promise((resolve) => setImmediate(resolve));

        expect(exitOneshot).toHaveBeenCalledWith(0);
    });
});
