// @ts-nocheck
import path from 'path';
import express from 'express';

/**
 * Init the UI router.
 * @returns {*|Router}
 */
export function init() {
    const router = express.Router();
    router.use(express.static(path.join(__dirname, '..', '..', 'ui')));

    // Redirect all 404 to index.html (for vue history mode)
    router.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', '..', 'ui', 'index.html'));
    });
    return router;
}
