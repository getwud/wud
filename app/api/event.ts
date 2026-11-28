import express from 'express';
import * as event from '../event';

const activeClosers = new Set<() => void>();

/**
 * Close all active SSE event streams and clean up timers and listeners.
 */
export function close(): void {
    for (const closeClient of [...activeClosers]) {
        closeClient();
    }
    activeClosers.clear();
}

export function init() {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        res.write(': keepalive\n\n');

        const keepAlive = setInterval(() => {
            if (!res.writableEnded) {
                res.write(': keepalive\n\n');
            }
        }, 20000);
        if (typeof keepAlive.unref === 'function') {
            keepAlive.unref();
        }

        const formatSse = (type: string, data: unknown) => {
            return `data: ${JSON.stringify({ type, timestamp: new Date().toISOString(), data })}\n\n`;
        };

        const writeEvent = (type: string, data: unknown) => {
            if (!res.writableEnded) {
                res.write(formatSse(type, data));
            }
        };

        const onWatchStart = (data: unknown) =>
            writeEvent('wud:watch-start', data);
        const onWatchProgress = (data: unknown) =>
            writeEvent('wud:watch-progress', data);
        const onWatchStop = (data: unknown) =>
            writeEvent('wud:watch-stop', data);
        const onContainerAdded = (data: unknown) =>
            writeEvent('wud:container-added', data);
        const onContainerUpdated = (data: unknown) =>
            writeEvent('wud:container-updated', data);
        const onContainerRemoved = (data: unknown) =>
            writeEvent('wud:container-removed', data);
        const onContainerReport = (data: unknown) =>
            writeEvent('wud:container-report', data);

        event.registerWatchStart(onWatchStart);
        event.registerWatchProgress(onWatchProgress);
        event.registerWatchStop(onWatchStop);
        event.registerContainerAdded(onContainerAdded);
        event.registerContainerUpdated(onContainerUpdated);
        event.registerContainerRemoved(onContainerRemoved);
        event.registerContainerReport(onContainerReport);

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) {
                return;
            }
            cleanedUp = true;
            activeClosers.delete(closeClient);
            clearInterval(keepAlive);
            event.unregisterWatchStart(onWatchStart);
            event.unregisterWatchProgress(onWatchProgress);
            event.unregisterWatchStop(onWatchStop);
            event.unregisterContainerAdded(onContainerAdded);
            event.unregisterContainerUpdated(onContainerUpdated);
            event.unregisterContainerRemoved(onContainerRemoved);
            event.unregisterContainerReport(onContainerReport);
        };

        const closeClient = () => {
            cleanup();
            if (typeof res.end === 'function' && !res.writableEnded) {
                res.end();
            }
        };

        activeClosers.add(closeClient);
        req.on('close', cleanup);
    });

    return router;
}
