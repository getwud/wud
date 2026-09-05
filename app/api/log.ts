// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { getLogLevel } from '../configuration';
import { logEmitter, logHistory } from '../log';

export function getLog(req, res) {
    nocache()(req, res, () => {
        res.status(200).json({
            level: getLogLevel(),
        });
    });
}

/**
 * Stream logs via Server-Sent Events.
 * @param req
 * @param res
 */
export function streamLogs(req, res) {
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
