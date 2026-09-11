// @ts-nocheck
import fs from 'fs';
import path from 'path';
import express from 'express';
import { getServerConfiguration } from '../configuration';

const indexHtmlPath = path.join(__dirname, '..', '..', 'ui', 'index.html');

function serveIndex(res) {
    const basePath = getServerConfiguration().basepath;
    const baseHref = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    const injected = html.replace(
        '<head>',
        `<head><base href="${baseHref}"><script>window.__WUD_BASE_PATH__='${baseHref}';</script>`,
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
    const uiDir = path.join(__dirname, '..', '..', 'ui');
    router.use(express.static(uiDir, { index: false }));
    router.use('*/js', express.static(path.join(uiDir, 'js')));
    router.use('*/css', express.static(path.join(uiDir, 'css')));
    router.use('*/img', express.static(path.join(uiDir, 'img')));
    router.use('*/fonts', express.static(path.join(uiDir, 'fonts')));

    // Redirect all 404 to index.html (for vue history mode)
    router.get('*', (req, res) => {
        serveIndex(res);
    });
    return router;
}
