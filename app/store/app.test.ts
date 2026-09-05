import * as app from './app';
import { initDatabase, closeDatabase } from './db';

jest.mock('../configuration', () => ({
    getVersion: () => '2.0.0',
    getLogLevel: () => 'info',
}));

describe('App Store (SQLite)', () => {
    beforeEach(() => {
        closeDatabase();
        initDatabase(':memory:');
        jest.clearAllMocks();
    });

    afterAll(() => {
        closeDatabase();
    });

    test('createCollections should insert app version and return app info', () => {
        app.createCollections();

        const info = app.getAppInfos();
        expect(info).toEqual({
            name: 'wud',
            version: '2.0.0',
        });
    });

    test('saveAppInfosAndMigrate should record current app info', () => {
        app.saveAppInfosAndMigrate();

        const info = app.getAppInfos();
        expect(info).toEqual({
            name: 'wud',
            version: '2.0.0',
        });
    });
});
