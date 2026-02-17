// @ts-nocheck
import express from 'express';
import passport from 'passport';
import * as appRouter from './app';
import * as containerRouter from './container';
import * as watcherRouter from './watcher';
import * as triggerRouter from './trigger';
import * as registryRouter from './registry';
import * as authenticationRouter from './authentication';
import * as logRouter from './log';
import * as storeRouter from './store';
import * as serverRouter from './server';
import * as auth from './auth';

/**
 * Init the API router.
 * @returns {*|Router}
 */
export function init() {
    const router = express.Router();

    // Mount app router
    router.use('/app', appRouter.init());

    // Routes to protect after this line
    router.use(passport.authenticate(auth.getAllIds()));

    // Mount log router
    router.use('/log', logRouter.init());

    // Mount store router
    router.use('/store', storeRouter.init());

    // Mount server router
    router.use('/server', serverRouter.init());

    // Mount container router
    router.use('/containers', containerRouter.init());

    // Mount trigger router
    router.use('/triggers', triggerRouter.init());

    // Mount watcher router
    router.use('/watchers', watcherRouter.init());

    // Mount registry router
    router.use('/registries', registryRouter.init());

    // Mount auth
    router.use('/authentications', authenticationRouter.init());

    // All other API routes => 404
    router.get('/*', (req, res) => res.sendStatus(404));

    return router;
}
