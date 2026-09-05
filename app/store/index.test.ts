import fs from 'fs';
import { store } from './index';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

jest.mock('../configuration', () => ({
    getStoreConfiguration: jest.fn(() => ({
        path: '/test/store',
        file: 'test.sqlite',
    })),
    getVersion: jest.fn(() => '1.0.0'),
    getLogLevel: jest.fn(() => 'info'),
}));

jest.mock('./app', () => ({
    createCollections: jest.fn(),
}));

jest.mock('./container', () => ({
    createCollections: jest.fn(),
}));

jest.mock('./db', () => ({
    initDatabase: jest.fn(() => ({
        sqlite: {},
        db: {},
    })),
    getDb: jest.fn(),
    getSqlite: jest.fn(),
    closeDatabase: jest.fn(),
}));

jest.mock('./migrate_loki', () => ({
    migrateLokiToSqlite: jest.fn(),
}));

describe('Store Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should initialize store successfully and create directory if missing', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        await store.init();

        expect(fs.mkdirSync).toHaveBeenCalledWith('/test/store', {
            recursive: true,
        });
        const app = await import('./app');
        const container = await import('./container');
        expect(app.createCollections).toHaveBeenCalled();
        expect(container.createCollections).toHaveBeenCalled();
    });

    test('should return configuration', () => {
        const config = store.getConfiguration();
        expect(config).toEqual({
            path: '/test/store',
            file: 'test.sqlite',
        });
    });

    test('should trigger loki migration if legacy file exists', async () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath.endsWith('wud.json')) {
                return true;
            }
            return true;
        });

        const { migrateLokiToSqlite } = await import('./migrate_loki');
        await store.init();

        expect(migrateLokiToSqlite).toHaveBeenCalled();
    });

    test('should dispose store and close database', () => {
        const { closeDatabase: mockClose } = require('./db');
        store.dispose();
        expect(mockClose).toHaveBeenCalled();
    });
});
