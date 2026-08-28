import express from 'express';
import request from 'supertest';
import * as ui from './ui';
import fs from 'fs';

jest.spyOn(fs, 'readFileSync').mockReturnValue(
    '<html><body><div id="app"></div></body></html>',
);
jest.mock('../configuration', () => ({
    getServerConfiguration: jest.fn(() => ({
        basepath: '/wud',
    })),
}));

describe('API UI', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(ui.init());
    });

    test('should serve index html and inject basepath', async () => {
        const res = await request(app).get('/any-path');
        expect(res.status).toBe(200);
        expect(res.header['content-type']).toContain('text/html');
        expect(res.header['cache-control']).toBe('no-store');
        expect(res.text).toContain(
            '<script>window.__WUD_BASE_PATH__=\'/wud\'</script><div id="app">',
        );
    });
});
