import express from 'express';
import request from 'supertest';
import * as watcherApi from './watcher';
import * as registry from '../registry';

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        watcher: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true }),
            },
        },
    })),
}));

describe('API Watcher', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.get('/', watcherApi.getWatchers);
        app.get('/:type/:name', watcherApi.getWatcher);
    });

    test('should get all watchers', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: 'mock.test',
                type: 'mock',
                name: 'test',
                configuration: { mockConfig: true },
            },
        ]);
    });

    test('should get watcher by type and name', async () => {
        const res = await request(app).get('/mock/test');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: 'mock.test',
            type: 'mock',
            name: 'test',
            configuration: { mockConfig: true },
        });
    });

    test('should return 404 for unknown watcher', async () => {
        const res = await request(app).get('/mock/unknown');
        expect(res.status).toBe(404);
    });
});
