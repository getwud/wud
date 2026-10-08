import { EventEmitter } from 'events';
import request from 'supertest';
import express from 'express';
import * as eventApi from './event';
import * as event from '../event';

describe('Event API', () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        app.use('/events', eventApi.init());
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('should connect and receive SSE events', (done) => {
        const req = request(app)
            .get('/events')
            .expect('Content-Type', 'text/event-stream')
            .expect(200);

        req.buffer(false).end((err) => {
            if (err) return done(err);
        });

        req.on('response', (res) => {
            res.on('data', (chunk) => {
                const str = chunk.toString();
                if (str.includes(': keepalive')) {
                    // Emit an event to test
                    event.emitWatchStart({ total: 10 });
                }
                if (str.includes('wud:watch-start')) {
                    expect(str).toContain('{"total":10}');
                    done();
                }
            });
        });
    });

    it('should receive wud:container-added event', (done) => {
        const req = request(app)
            .get('/events')
            .expect('Content-Type', 'text/event-stream')
            .expect(200);

        req.buffer(false).end((err) => {
            if (err) return done(err);
        });

        req.on('response', (res) => {
            res.on('data', (chunk) => {
                const str = chunk.toString();
                if (str.includes(': keepalive')) {
                    event.emitContainerAdded({
                        id: 'container-added-1',
                        name: 'app-add',
                    });
                }
                if (str.includes('wud:container-added')) {
                    expect(str).toContain('"id":"container-added-1"');
                    expect(str).toContain('"name":"app-add"');
                    done();
                }
            });
        });
    });

    it('should receive wud:container-removed event', (done) => {
        const req = request(app)
            .get('/events')
            .expect('Content-Type', 'text/event-stream')
            .expect(200);

        req.buffer(false).end((err) => {
            if (err) return done(err);
        });

        req.on('response', (res) => {
            res.on('data', (chunk) => {
                const str = chunk.toString();
                if (str.includes(': keepalive')) {
                    event.emitContainerRemoved({
                        id: 'container-removed-1',
                        name: 'app-del',
                    });
                }
                if (str.includes('wud:container-removed')) {
                    expect(str).toContain('"id":"container-removed-1"');
                    expect(str).toContain('"name":"app-del"');
                    done();
                }
            });
        });
    });

    it('should receive wud:container-updated and wud:watch-stop events', (done) => {
        const req = request(app)
            .get('/events')
            .expect('Content-Type', 'text/event-stream')
            .expect(200);

        req.buffer(false).end((err) => {
            if (err) return done(err);
        });

        let receivedUpdated = false;
        req.on('response', (res) => {
            res.on('data', (chunk) => {
                const str = chunk.toString();
                if (str.includes(': keepalive')) {
                    event.emitContainerUpdated({
                        id: 'container-up-1',
                        name: 'app-up',
                    });
                }
                if (str.includes('wud:container-updated')) {
                    expect(str).toContain('"id":"container-up-1"');
                    receivedUpdated = true;
                    event.emitWatchStop({ watcher: 'docker' });
                }
                if (str.includes('wud:watch-stop') && receivedUpdated) {
                    expect(str).toContain('"watcher":"docker"');
                    done();
                }
            });
        });
    });

    it('should unregister all event listeners when client disconnects', () => {
        const unregisterWatchStartSpy = jest.spyOn(
            event,
            'unregisterWatchStart',
        );
        const unregisterWatchProgressSpy = jest.spyOn(
            event,
            'unregisterWatchProgress',
        );
        const unregisterWatchStopSpy = jest.spyOn(event, 'unregisterWatchStop');
        const unregisterContainerAddedSpy = jest.spyOn(
            event,
            'unregisterContainerAdded',
        );
        const unregisterContainerUpdatedSpy = jest.spyOn(
            event,
            'unregisterContainerUpdated',
        );
        const unregisterContainerRemovedSpy = jest.spyOn(
            event,
            'unregisterContainerRemoved',
        );
        const unregisterContainerReportSpy = jest.spyOn(
            event,
            'unregisterContainerReport',
        );

        const router = eventApi.init();
        const req = new EventEmitter() as unknown as express.Request;
        const res = {
            writeHead: jest.fn(),
            write: jest.fn(),
        } as unknown as express.Response;

        const layer = (router as any).stack.find(
            (s: any) => s.route?.path === '/',
        );
        const handler = layer.route.stack[0].handle;

        handler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        req.emit('close');

        expect(unregisterWatchStartSpy).toHaveBeenCalled();
        expect(unregisterWatchProgressSpy).toHaveBeenCalled();
        expect(unregisterWatchStopSpy).toHaveBeenCalled();
        expect(unregisterContainerAddedSpy).toHaveBeenCalled();
        expect(unregisterContainerUpdatedSpy).toHaveBeenCalled();
        expect(unregisterContainerRemovedSpy).toHaveBeenCalled();
        expect(unregisterContainerReportSpy).toHaveBeenCalled();
    });

    describe('Authentication protection on /api/events', () => {
        it('should reject unauthenticated requests with HTTP 401 Unauthorized', async () => {
            const authApp = express();
            // Authentication middleware that rejects unauthenticated clients
            authApp.use((req: any, res: any, next: any) => {
                if (!req.isAuthenticated || !req.isAuthenticated()) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                next();
            });
            authApp.use('/api/events', eventApi.init());

            const res = await request(authApp).get('/api/events');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Unauthorized' });
        });

        it('should accept authenticated requests with HTTP 200 and SSE stream', (done) => {
            const authApp = express();
            authApp.use((req: any, _res: any, next: any) => {
                req.isAuthenticated = () => true;
                req.user = { username: 'testuser' };
                next();
            });
            authApp.use('/api/events', eventApi.init());

            const req = request(authApp)
                .get('/api/events')
                .expect('Content-Type', 'text/event-stream')
                .expect(200);

            req.buffer(false).end((err) => {
                if (err) return done(err);
            });

            req.on('response', (res) => {
                res.on('data', (chunk) => {
                    const str = chunk.toString();
                    if (str.includes(': keepalive')) {
                        done();
                    }
                });
            });
        });
    });
});
