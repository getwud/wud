import express from 'express';
import request from 'supertest';
import * as hubRouter from './hub';
import { getRemoteMetadataProvider } from '../metadata';

jest.mock('../metadata', () => {
    const mockProvider = {
        getStatus: jest.fn(() => ({
            enabled: true,
            status: 'connected',
            endpoint: 'https://hub.getwud.com',
            hasKey: true,
        })),
        getOrFetchStatus: jest.fn(async (forceRefresh?: boolean) => ({
            enabled: true,
            status: 'connected',
            endpoint: 'https://hub.getwud.com',
            hasKey: true,
            remote: {
                organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
                apiKey: { preview: 'wud_...0001', valid: true, scopes: [] },
                subscription: {
                    planTier: 'free',
                    status: 'active',
                    trialDaysRemaining: null,
                    portalUrl: null,
                },
                quota: { monitoredContainers: 5, limit: 10 },
            },
        })),
    };
    return {
        getRemoteMetadataProvider: jest.fn(() => mockProvider),
    };
});

describe('Hub API Router', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.setTimeout(15000);
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/hub', hubRouter.init());
    });

    test('GET /hub/status should return 200 with status summary for authenticated user', async () => {
        const res = await request(app).get('/hub/status');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('connected');
        expect(res.body.enabled).toBe(true);
        expect(res.body.hasKey).toBe(true);
        expect(res.body.remote).toBeDefined();
        expect(res.body.remote.organization.name).toBe('Acme');

        const provider = getRemoteMetadataProvider();
        expect(provider.getOrFetchStatus).toHaveBeenCalledWith(false);
    });

    test('GET /hub/status?refresh=true should pass forceRefresh to getOrFetchStatus', async () => {
        const res = await request(app).get('/hub/status?refresh=true');
        expect(res.status).toBe(200);

        const provider = getRemoteMetadataProvider();
        expect(provider.getOrFetchStatus).toHaveBeenCalledWith(true);
    });

    test('postChangelogRiskAnalysis should call Hub endpoint with correct headers and return response data', async () => {
        const mockData = {
            imageRef: 'redis',
            currentTag: '7.0.15',
            targetTag: '7.2.4',
            riskScore: 'medium',
            breakingChanges: [],
            envVarChanges: [],
            databaseImpact: null,
            summary: 'Safe update',
        };
        const axios = require('axios');
        jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: mockData });

        const result = await hubRouter.postChangelogRiskAnalysis(
            'https://hub.example.com/',
            'test_token',
            { imageRef: 'redis', currentTag: '7.0.15', targetTag: '7.2.4' },
            3000,
        );

        expect(result).toEqual(mockData);
        expect(axios.post).toHaveBeenCalledWith(
            'https://hub.example.com/api/v1/changelogs/risk-analysis',
            { imageRef: 'redis', currentTag: '7.0.15', targetTag: '7.2.4' },
            {
                headers: {
                    Authorization: 'Bearer test_token',
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: 3000,
            },
        );
    });
});
