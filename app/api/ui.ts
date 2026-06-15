// @ts-nocheck
import fs from 'fs';
import path from 'path';
import express from 'express';
import { getServerConfiguration } from '../configuration';

const indexHtmlPath = path.join(__dirname, '..', '..', 'ui', 'index.html');

function serveIndex(res) {
    const basePath = getServerConfiguration().basepath;
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    const injected = html.replace(
        '<div id="app">',
        `<script>window.__WUD_BASE_PATH__='${basePath}'</script><div id="app">`,
    );
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.send(injected);
}

/**
 * Init the UI router.
 * @returns {*|Router}
 */
export function init() {
    const router = express.Router();
    router.use(express.static(path.join(__dirname, '..', '..', 'ui'), { index: false }));

    // Redirect all 404 to index.html (for vue history mode)
    router.get('*', (req, res) => {
        serveIndex(res);
    });
    return router;
}
