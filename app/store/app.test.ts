// @ts-nocheck
import * as app from './app';
import * as migrate from './migrate';

jest.mock('../configuration', () => ({
    getVersion: () => '2.0.0',
    getLogLevel: () => 'info',
}));
jest.mock('./migrate');

beforeEach(async () => {
    jest.resetAllMocks();
});

test('createCollections should create collection app when not exist', async () => {
    const db = {
        getCollection: () => null,
        addCollection: () => ({
            findOne: () => {},
            insert: () => {},
        }),
    };
    const spy = jest.spyOn(db, 'addCollection');
    app.createCollections(db);
    expect(spy).toHaveBeenCalledWith('app');
});

test('createCollections should not create collection app when already exist', async () => {
    const db = {
        getCollection: () => ({
            findOne: () => {},
            insert: () => {},
        }),
        addCollection: () => null,
    };
    const spy = jest.spyOn(db, 'addCollection');
    app.createCollections(db);
    expect(spy).not.toHaveBeenCalled();
});

test('createCollections should call migrate when versions are different', async () => {
    const db = {
        getCollection: () => ({
            findOne: () => ({
                name: 'wud',
                version: '1.0.0',
            }),
            insert: () => {},
            remove: () => {},
        }),
        addCollection: () => null,
    };
    const spy = jest.spyOn(migrate, 'migrate');
    app.createCollections(db);
    expect(spy).toHaveBeenCalledWith('1.0.0', '2.0.0');
});

test('createCollections should not call migrate when versions are identical', async () => {
    const db = {
        getCollection: () => ({
            findOne: () => ({
                name: 'wud',
                version: '2.0.0',
            }),
            insert: () => {},
            remove: () => {},
        }),
        addCollection: () => null,
    };
    const spy = jest.spyOn(migrate, 'migrate');
    app.createCollections(db);
    expect(spy).not.toHaveBeenCalledWith();
});

test('getAppInfos should return collection content', async () => {
    const db = {
        getCollection: () => ({
            findOne: () => ({
                name: 'wud',
                version: '1.0.0',
            }),
            insert: () => {},
            remove: () => {},
        }),
        addCollection: () => null,
    };
    app.createCollections(db);
    expect(app.getAppInfos(db)).toStrictEqual({
        name: 'wud',
        version: '1.0.0',
    });
});
