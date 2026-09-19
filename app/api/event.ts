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

        const formatSse = (type: string, data: any) => {
            return `data: ${JSON.stringify({ type, timestamp: new Date().toISOString(), data })}\n\n`;
        };

        const onWatchStart = (data: any) =>
            res.write(formatSse('wud:watch-start', data));
        const onWatchProgress = (data: any) =>
            res.write(formatSse('wud:watch-progress', data));
        const onWatchStop = (data: any) =>
            res.write(formatSse('wud:watch-stop', data));
        const onContainerUpdated = (data: any) =>
            res.write(formatSse('wud:container-updated', data));
        const onContainerReport = (data: any) =>
            res.write(formatSse('wud:container-report', data));

        event.registerWatchStart(onWatchStart);
        event.registerWatchProgress(onWatchProgress);
        event.registerWatchStop(onWatchStop);
        event.registerContainerUpdated(onContainerUpdated);
        event.registerContainerReport(onContainerReport);

        req.on('close', () => {
            clearInterval(keepAlive);
            event.unregisterWatchStart(onWatchStart);
            event.unregisterWatchProgress(onWatchProgress);
            event.unregisterWatchStop(onWatchStop);
            event.unregisterContainerUpdated(onContainerUpdated);
            event.unregisterContainerReport(onContainerReport);
        });
    });

    return router;
}
