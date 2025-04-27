import express from 'express';
import nocache from 'nocache';
import expressHealthCheck from 'express-healthcheck';

/**
 * HealthCheck router.
 */
const router = express.Router();

/**
 * Init Router.
 */
export function init() {
    router.use(nocache());
    router.get('/', expressHealthCheck());
    return router;
}
