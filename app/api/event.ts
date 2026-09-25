import express from 'express';
import * as event from '../event';

export function init() {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        res.write(': keepalive\n\n');

        const keepAlive = setInterval(() => {
            res.write(': keepalive\n\n');
        }, 20000);

        const formatSse = (type: string, data: unknown) => {
            return `data: ${JSON.stringify({ type, timestamp: new Date().toISOString(), data })}\n\n`;
        };

        const onWatchStart = (data: unknown) =>
            res.write(formatSse('wud:watch-start', data));
        const onWatchProgress = (data: unknown) =>
            res.write(formatSse('wud:watch-progress', data));
        const onWatchStop = (data: unknown) =>
            res.write(formatSse('wud:watch-stop', data));
        const onContainerAdded = (data: unknown) =>
            res.write(formatSse('wud:container-added', data));
        const onContainerUpdated = (data: unknown) =>
            res.write(formatSse('wud:container-updated', data));
        const onContainerRemoved = (data: unknown) =>
            res.write(formatSse('wud:container-removed', data));
        const onContainerReport = (data: unknown) =>
            res.write(formatSse('wud:container-report', data));

        event.registerWatchStart(onWatchStart);
        event.registerWatchProgress(onWatchProgress);
        event.registerWatchStop(onWatchStop);
        event.registerContainerAdded(onContainerAdded);
        event.registerContainerUpdated(onContainerUpdated);
        event.registerContainerRemoved(onContainerRemoved);
        event.registerContainerReport(onContainerReport);

        req.on('close', () => {
            clearInterval(keepAlive);
            event.unregisterWatchStart(onWatchStart);
            event.unregisterWatchProgress(onWatchProgress);
            event.unregisterWatchStop(onWatchStop);
            event.unregisterContainerAdded(onContainerAdded);
            event.unregisterContainerUpdated(onContainerUpdated);
            event.unregisterContainerRemoved(onContainerRemoved);
            event.unregisterContainerReport(onContainerReport);
        });
    });

    return router;
}
