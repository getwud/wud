// @ts-nocheck
import fs from 'fs';
import * as store from './index';

// Mock dependencies
jest.mock('lokijs', () => {
    return jest.fn().mockImplementation(() => ({
        loadDatabase: jest.fn((options, callback) => {
            // Simulate successful database load
            callback(null);
        }),
    }));
});

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

jest.mock('../configuration', () => ({
    getStoreConfiguration: jest.fn(() => ({
        path: '/test/store',
        file: 'test.json',
    })),
}));

jest.mock('./app', () => ({
    createCollections: jest.fn(),
}));

jest.mock('./container', () => ({
    createCollections: jest.fn(),
}));

jest.mock('../log', () => ({
    child: jest.fn(() => ({
        info: jest.fn(),
    })),
}));

describe('Store Module', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('should initialize store successfully', async () => {
        fs.existsSync.mockReturnValue(true);

        await store.init();

        const app = await import('./app');
        const container = await import('./container');

        expect(app.createCollections).toHaveBeenCalled();
        expect(container.createCollections).toHaveBeenCalled();
    });

    test('should create directory if it does not exist', async () => {
        fs.existsSync.mockReturnValue(false);

        await store.init();

        expect(fs.mkdirSync).toHaveBeenCalledWith('/test/store');
    });

    test('should return configuration', async () => {
        const config = store.getConfiguration();

        expect(config).toEqual({
            path: '/test/store',
            file: 'test.json',
        });
    });

    test('should handle database load error', async () => {
        // Reset modules to get a fresh instance
        jest.resetModules();

        // Mock Loki to simulate error
        jest.doMock('lokijs', () => {
            return jest.fn().mockImplementation(() => ({
                loadDatabase: jest.fn((options, callback) => {
                    callback(new Error('Database load failed'));
                }),
            }));
        });

        const storeWithError = await import('./index');
        await expect(storeWithError.init()).rejects.toThrow(
            'Database load failed',
        );
    });
});
