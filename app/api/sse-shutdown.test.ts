import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import * as eventApi from './event';
import * as logApi from './log';
import { logEmitter } from '../log';

jest.mock('../configuration', () => ({
    getServerConfiguration: jest.fn(() => ({
        enabled: true,
        port: 0,
        cors: { enabled: false },
        tls: { enabled: false },
    })),
    getLogLevel: jest.fn(() => 'info'),
}));
jest.mock('./auth', () => ({
    init: jest.fn(),
    requireAuthentication: (
        _req: express.Request,
        _res: express.Response,
        next: express.NextFunction,
    ) => next(),
}));
jest.mock('./ui', () => ({ init: jest.fn(() => express.Router()) }));
jest.mock('./prometheus', () => ({ init: jest.fn(() => express.Router()) }));
jest.mock('./health', () => ({ init: jest.fn(() => express.Router()) }));
jest.mock('./api', () => {
    const expressLocal = require('express');
    const eventRouterLocal = require('./event');
    const logRouterLocal = require('./log');
    return {
        init: jest.fn(() => {
            const router = expressLocal.Router();
            router.use('/events', eventRouterLocal.init());
            router.use('/log', logRouterLocal.init());
            return router;
        }),
        close: jest.fn(() => {
            eventRouterLocal.close();
            logRouterLocal.close();
        }),
    };
});

function openSseStream(
    port: number,
    path: string,
): Promise<{
    req: http.ClientRequest;
    res: http.IncomingMessage;
    ended: Promise<void>;
}> {
    return new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port, path }, (res) => {
            res.on('error', () => {});
            const ended = new Promise<void>((resEnd) => {
                res.on('end', () => resEnd());
                res.on('close', () => resEnd());
            });
            res.resume();
            resolve({ req, res, ended });
        });
        req.on('error', reject);
    });
}

describe('API graceful shutdown with active SSE connections', () => {
    afterEach(async () => {
        const apiIndex = await import('./index');
        await apiIndex.close();
        eventApi.close();
        logApi.close();
    });

    test('api.close() resolves promptly with active /api/events and /api/log/stream SSE clients', async () => {
        const apiIndex = await import('./index');
        await apiIndex.init();

        const server = apiIndex.getServer() as http.Server;
        if (!server.listening) {
            await new Promise<void>((resolve) =>
                server.once('listening', () => resolve()),
            );
        }
        const { port } = server.address() as AddressInfo;

        const initialLogListeners = logEmitter.listenerCount('log');

        const eventsStream = await openSseStream(port, '/api/events');
        const logStream = await openSseStream(port, '/api/log/stream');

        expect(eventsStream.res.statusCode).toBe(200);
        expect(logStream.res.statusCode).toBe(200);
        expect(logEmitter.listenerCount('log')).toBe(initialLogListeners + 1);

        const startedAt = Date.now();
        await apiIndex.close();
        const elapsedMs = Date.now() - startedAt;

        // Without active-connection teardown, server.close() would stall indefinitely
        // until the 10s shutdown fallback timer fires.
        expect(elapsedMs).toBeLessThan(2000);
        expect(logEmitter.listenerCount('log')).toBe(initialLogListeners);

        await Promise.all([eventsStream.ended, logStream.ended]);
    });
});
