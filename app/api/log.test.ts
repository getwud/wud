import { EventEmitter } from 'events';
import express from 'express';
import request from 'supertest';
import * as log from './log';
import { logEmitter, logHistory } from '../log';

jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'debug'),
}));

describe('API Log', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(log.init());
    });

    afterEach(() => {
        log.close();
    });

    test('should return log level', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ level: 'debug' });
        expect(res.header['cache-control']).toContain('no-cache');
    });

    test('should stream logs and unregister listener on client disconnect', () => {
        const initialListeners = logEmitter.listenerCount('log');
        const req = new EventEmitter() as unknown as express.Request;
        const res = {
            setHeader: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            writableEnded: false,
        } as unknown as express.Response;

        log.streamLogs(req, res);

        expect(res.setHeader).toHaveBeenCalledWith(
            'Content-Type',
            'text/event-stream',
        );
        expect(res.flushHeaders).toHaveBeenCalled();
        expect(logEmitter.listenerCount('log')).toBe(initialListeners + 1);

        const initialWrites = (res.write as jest.Mock).mock.calls.length;
        expect(initialWrites).toBe(logHistory.length);

        logEmitter.emit('log', { msg: 'live-log' });
        expect(res.write).toHaveBeenCalledWith(
            `data: ${JSON.stringify({ msg: 'live-log' })}\n\n`,
        );

        req.emit('close');
        expect(logEmitter.listenerCount('log')).toBe(initialListeners);
    });

    test('should close all active log streams and unregister listeners on close()', () => {
        const initialListeners = logEmitter.listenerCount('log');
        const req = new EventEmitter() as unknown as express.Request;
        const res = {
            setHeader: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn(),
            end: jest.fn(function (this: { writableEnded: boolean }) {
                this.writableEnded = true;
            }),
            writableEnded: false,
        } as unknown as express.Response;

        log.streamLogs(req, res);
        expect(logEmitter.listenerCount('log')).toBe(initialListeners + 1);

        log.close();

        expect(res.end).toHaveBeenCalledTimes(1);
        expect(logEmitter.listenerCount('log')).toBe(initialListeners);

        // Emitting logs or req close after close() must not write or throw
        const writesAfterClose = (res.write as jest.Mock).mock.calls.length;
        logEmitter.emit('log', { msg: 'after-close' });
        req.emit('close');
        expect((res.write as jest.Mock).mock.calls.length).toBe(
            writesAfterClose,
        );
    });
});
