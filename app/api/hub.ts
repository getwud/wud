import express from 'express';
import { getRemoteMetadataProvider } from '../metadata';

export function init() {
    const router = express.Router();
    const provider = getRemoteMetadataProvider();

    router.get('/status', async (req, res) => {
        const forceRefresh = req.query.refresh === 'true';
        const status = await provider.getOrFetchStatus(forceRefresh);
        res.status(200).json(status);
    });

    return router;
}
