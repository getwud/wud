import express from 'express';
import { getRemoteMetadataProvider } from '../metadata';
import { requireRole } from './rbac';
import { requireAuthentication } from './auth';

export function init() {
    const router = express.Router();
    const provider = getRemoteMetadataProvider();

    router.get('/status', (req, res) => {
        res.status(200).json(provider.getStatus());
    });

    router.post(
        '/cache/clear',
        requireAuthentication,
        requireRole(['admin'], 'write'),
        (req, res) => {
            provider.clearCache();
            res.sendStatus(204);
        },
    );

    return router;
}
