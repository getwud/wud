import express from 'express';
import request from 'supertest';
import * as storeApi from './store';
import * as store from '../store';

jest.mock('../store', () => ({
    store: {
        getConfiguration: jest.fn(() => ({
            someConfig: 'value',
        })),
    },
}));

describe('API Store', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(storeApi.init());
    });

    test('should return store configuration', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ configuration: { someConfig: 'value' } });
        expect(res.header['cache-control']).toContain('no-cache');
    });
});
