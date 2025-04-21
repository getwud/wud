import express, { Request, Response } from 'express';
import passport from 'passport';
import nocache from 'nocache';
import { output } from '../prometheus';
import * as auth from './auth';

/**
 * Prometheus Metrics router.
 */
const router = express.Router();

/**
 * Return Prometheus Metrics as String.
 * @param req
 * @param res
 */
async function outputMetrics(req: Request, res: Response) {
    res.status(200)
        .type('text')
        .send(await output());
}

/**
 * Init Router.
 */
export function init() {
    router.use(nocache());

    // Routes to protect after this line
    router.use(passport.authenticate(auth.getAllIds()));

    router.get('/', outputMetrics);
    return router;
}

