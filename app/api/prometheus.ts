// @ts-nocheck
import express from 'express';
import passport from 'passport';
import nocache from 'nocache';
import { output } from '../prometheus';
import * as auth from './auth';

/**
 * Prometheus Metrics router.
 * @type {Router}
 */
const router = express.Router();

/**
 * Return Prometheus Metrics as String.
 * @param req
 * @param res
 */
async function outputMetrics(req, res) {
    res.status(200)
        .type('text')
        .send(await output());
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    router.use(nocache());

    // Routes to protect after this line
    router.use(passport.authenticate(auth.getAllIds()));

    router.get('/', outputMetrics);
    return router;
}
