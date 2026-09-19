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

        req.buffer(false).end((err, res) => {
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
});
