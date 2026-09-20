import express from 'express';
import request from 'supertest';
import * as prometheusApi from './prometheus';
import { output } from '../prometheus';
import { requireAuthentication } from './auth';
import { getPrometheusConfiguration } from '../configuration';

jest.mock('../prometheus', () => ({
    output: jest.fn(() => Promise.resolve('mock-metrics')),
}));

jest.mock('./auth', () => ({
    requireAuthentication: jest.fn((req, res, next) => next()),
}));

jest.mock('../configuration', () => ({
    getPrometheusConfiguration: jest.fn(() => ({
        enabled: true,
        auth: true,
    })),
}));

describe('API Prometheus', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return prometheus metrics and require auth when auth is true (default)', async () => {
        (getPrometheusConfiguration as jest.Mock).mockReturnValue({
            enabled: true,
            auth: true,
        });
        app = express();
        app.use(express.json());
        app.use(prometheusApi.init());

        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.type).toBe('text/plain');
        expect(res.text).toEqual('mock-metrics');
        expect(output).toHaveBeenCalled();
        expect(requireAuthentication).toHaveBeenCalled();
    });

    test('should return prometheus metrics and NOT require auth when auth is false', async () => {
        (getPrometheusConfiguration as jest.Mock).mockReturnValue({
            enabled: true,
            auth: false,
        });
        app = express();
        app.use(express.json());
        app.use(prometheusApi.init());

        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.type).toBe('text/plain');
        expect(res.text).toEqual('mock-metrics');
        expect(output).toHaveBeenCalled();
        expect(requireAuthentication).not.toHaveBeenCalled();
    });
});
