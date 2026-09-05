// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { getServerConfiguration } from '../configuration';

const router = express.Router();

/**
 * Get server infos.
 * @param req
 * @param res
 */
export function getServer(req, res) {
    res.status(200).json({
        configuration: getServerConfiguration(),
    });
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    router.use(nocache());
    router.get('/', getServer);
    return router;
}
