import express from 'express';
import request from 'supertest';
import * as log from './log';
import * as configuration from '../configuration';

jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'debug')
}));

describe('API Log', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(log.init());
    });

    test('should return log level', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ level: 'debug' });
        expect(res.header['cache-control']).toContain('no-cache');
    });
});
