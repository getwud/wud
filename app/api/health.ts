// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import healthcheck from 'express-healthcheck';

/**
 * Healthcheck router.
 * @type {Router}
 */
const router = express.Router();

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    router.use(nocache());
    router.get('/', healthcheck());
    return router;
}
