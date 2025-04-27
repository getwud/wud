import * as app from './app';
import * as migrate from './migrate';

jest.mock('../configuration', () => ({
    getVersion: () => '2.0.0',
    getLogLevel: () => 'info',
}));
jest.mock('./migrate');

beforeEach(() => {
    jest.resetAllMocks();
});

test('createCollections should create collection app when not exist', () => {
    const db = {
        getCollection: () => null,
        addCollection: () => ({
            findOne: () => { },
            insert: () => { },
        }),
    } as unknown as Loki;
    const spy = jest.spyOn(db, 'addCollection');
    app.createCollections(db);
    expect(spy).toHaveBeenCalledWith('app');
});

test('createCollections should not create collection app when already exist', () => {
    const db = {
        getCollection: () => ({
            findOne: () => { },
            insert: () => { },
        }),
        addCollection: () => null,
    } as unknown as Loki;
    const spy = jest.spyOn(db, 'addCollection');
    app.createCollections(db);
    expect(spy).not.toHaveBeenCalled();
});

test('createCollections should call migrate when versions are different', () => {
    const db = {
        getCollection: () => ({
            findOne: () => ({
                name: 'wud',
                version: '1.0.0',
            }),
            insert: () => { },
            remove: () => { },
        }),
        addCollection: () => null,
    } as unknown as Loki;
    const spy = jest.spyOn(migrate, 'migrate');
    app.createCollections(db);
    expect(spy).toHaveBeenCalledWith('1.0.0', '2.0.0');
});

test('createCollections should not call migrate when versions are identical', () => {
    const db = {
        getCollection: () => ({
            findOne: () => ({
                name: 'wud',
                version: '2.0.0',
            }),
            insert: () => { },
            remove: () => { },
        }),
        addCollection: () => null,
    } as unknown as Loki;
    const spy = jest.spyOn(migrate, 'migrate');
    app.createCollections(db);
    expect(spy).not.toHaveBeenCalledWith();
});

test('getAppInfos should return collection content', () => {
    const db = {
        getCollection: () => ({
            findOne: () => ({
                name: 'wud',
                version: '1.0.0',
            }),
            insert: () => { },
            remove: () => { },
        }),
        addCollection: () => null,
    } as unknown as Loki;
    app.createCollections(db);
    expect(app.getAppInfos()).toStrictEqual({
        name: 'wud',
        version: '1.0.0',
    });
});
