import express from 'express';
import { getRemoteMetadataProvider } from '../metadata';

export function init() {
    const router = express.Router();
    const provider = getRemoteMetadataProvider();

    router.get('/status', (req, res) => {
        res.status(200).json(provider.getStatus());
    });

    return router;
}
