import express, { Request, Response } from 'express';
import nocache from 'nocache';
import { getLogLevel } from '../configuration';
import { logEmitter, logHistory } from '../log';

const router = express.Router();
const activeClosers = new Set<() => void>();

/**
 * Close all active log SSE streams and remove logEmitter listeners.
 */
export function close(): void {
    for (const closeClient of [...activeClosers]) {
        closeClient();
    }
    activeClosers.clear();
}

/**
 * Get log infos.
 * @param req
 * @param res
 */
export function getLog(req: Request, res: Response) {
    res.status(200).json({
        level: getLogLevel(),
    });
}

/**
 * Stream logs via Server-Sent Events.
 * @param req
 * @param res
 */
export function streamLogs(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send the history buffer first
    for (const log of logHistory) {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    const onLog = (log: unknown) => {
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify(log)}\n\n`);
        }
    };

    logEmitter.on('log', onLog);

    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp) {
            return;
        }
        cleanedUp = true;
        activeClosers.delete(closeClient);
        logEmitter.off('log', onLog);
    };

    const closeClient = () => {
        cleanup();
        if (typeof res.end === 'function' && !res.writableEnded) {
            res.end();
        }
    };

    activeClosers.add(closeClient);
    req.on('close', cleanup);
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    router.use(nocache());
    router.get('/', getLog);
    router.get('/stream', streamLogs);
    return router;
}
