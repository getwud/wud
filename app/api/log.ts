// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { getLogLevel } from '../configuration';
import { logEmitter, logHistory } from '../log';

const router = express.Router();

/**
 * Get log infos.
 * @param req
 * @param res
 */
function getLog(req, res) {
    res.status(200).json({
        level: getLogLevel(),
    });
}

/**
 * Stream logs via Server-Sent Events.
 * @param req
 * @param res
 */
function streamLogs(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send the history buffer first
    for (const log of logHistory) {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    const onLog = (log) => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    };

    logEmitter.on('log', onLog);

    req.on('close', () => {
        logEmitter.off('log', onLog);
    });
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
