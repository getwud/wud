import * as app from './app';
import * as migrate from './migrate';
import { initDatabase, closeDatabase } from './db';

jest.mock('../configuration', () => ({
    getVersion: () => '2.0.0',
    getLogLevel: () => 'info',
}));
jest.mock('./migrate');

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

    test('saveAppInfosAndMigrate should call migrate when versions are different', () => {
        const spyMigrate = jest.spyOn(migrate, 'migrate');

        // First save with version 2.0.0
        app.saveAppInfosAndMigrate();

        // Simulate new app run with different version
        const config = require('../configuration');
        jest.spyOn(config, 'getVersion').mockReturnValue('3.0.0');

        app.saveAppInfosAndMigrate();

        expect(spyMigrate).toHaveBeenCalledWith('2.0.0', '3.0.0');
    });

    test('saveAppInfosAndMigrate should not call migrate when versions are identical', () => {
        const spyMigrate = jest.spyOn(migrate, 'migrate');

        app.saveAppInfosAndMigrate();
        spyMigrate.mockClear();

        app.saveAppInfosAndMigrate();
        expect(spyMigrate).not.toHaveBeenCalled();
    });
});
