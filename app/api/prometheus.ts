// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { output } from '../prometheus';
import { requireAuthentication } from './auth';
import { getPrometheusConfiguration } from '../configuration';

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
    const router = express.Router();
    router.use(nocache());

    const prometheusConfiguration = getPrometheusConfiguration();

    // Routes to protect after this line
    if (prometheusConfiguration.auth === true) {
        router.use(requireAuthentication);
    }

    router.get('/', outputMetrics);
    return router;
}
