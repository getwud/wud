// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { getLogLevel } from '../configuration';

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
 * Init Router.
 * @returns {*}
 */
export function init() {
    router.use(nocache());
    router.get('/', getLog);
    return router;
}
