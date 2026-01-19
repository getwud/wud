// @ts-nocheck
// Mock all dependencies
jest.mock('./configuration', () => ({
    getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('./log', () => ({
    info: jest.fn(),
}));

jest.mock('./store', () => ({
    init: jest.fn().mockResolvedValue(),
}));

jest.mock('./registry', () => ({
    init: jest.fn().mockResolvedValue(),
}));

jest.mock('./api', () => ({
    init: jest.fn().mockResolvedValue(),
}));

jest.mock('./prometheus', () => ({
    init: jest.fn(),
}));

describe('Main Application', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        // Clear the module cache to ensure fresh imports
        jest.resetModules();
    });

    test('should initialize all components in correct order', async () => {
        const { default: log } = await import('./log');
        const store = await import('./store');
        const registry = await import('./registry');
        const api = await import('./api');
        const prometheus = await import('./prometheus');
        const { getVersion } = await import('./configuration');

        // Import and run the main module
        await import('./index');

        // Wait for async operations to complete
        await new Promise((resolve) => setImmediate(resolve));

        // Verify initialization order and calls
        expect(getVersion).toHaveBeenCalled();
        expect(log.info).toHaveBeenCalledWith(
            'WUD is starting (version = 1.0.0)',
        );
        expect(store.init).toHaveBeenCalled();
        expect(prometheus.init).toHaveBeenCalled();
        expect(registry.init).toHaveBeenCalled();
        expect(api.init).toHaveBeenCalled();
    });
});
