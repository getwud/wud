import express from 'express';
import request from 'supertest';
import * as ui from './ui';
import fs from 'fs';

const originalReadFileSync = fs.readFileSync;
jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, options) => {
    if (typeof filePath === 'string' && filePath.includes('index.html')) {
        return '<html><head></head><body><div id="app"></div></body></html>';
    }
    return originalReadFileSync(filePath, options);
});
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

    test('should serve index html and inject basepath in head', async () => {
        const res = await request(app).get('/any-path');
        expect(res.status).toBe(200);
        expect(res.header['content-type']).toContain('text/html');
        expect(res.header['cache-control']).toBe('no-store');
        expect(res.text).toContain(
            '<head><base href="/wud/"><script>window.__WUD_BASE_PATH__=\'/wud/\';</script>',
        );
    });
});
