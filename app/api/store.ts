import express, { Request, Response } from 'express';
import nocache from 'nocache';
import * as store from '../store';

const router = express.Router();

/**
 * Get store infos.
 * @param req
 * @param res
 */
function getStore(req: Request, res: Response) {
    res.status(200).json({
        configuration: store.getConfiguration(),
    });
}

/**
 * Init Router.
 */
export function init() {
    router.use(nocache());
    router.get('/', getStore);
    return router;
}

