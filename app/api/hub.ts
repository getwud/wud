import express from 'express';
import axios from 'axios';
import { getRemoteMetadataProvider } from '../metadata';
import { RiskAnalysisResult } from '../metadata/types';

export async function postChangelogRiskAnalysis(
    baseUrl: string,
    token: string,
    params: { imageRef: string; currentTag: string; targetTag: string },
    timeoutMs = 30000,
): Promise<RiskAnalysisResult> {
    const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/changelogs/risk-analysis`;
    const response = await axios.post<RiskAnalysisResult>(url, params, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        timeout: timeoutMs,
    });
    return response.data;
}

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
