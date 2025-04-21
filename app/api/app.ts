import express from 'express';
import nocache from 'nocache';
import * as storeApp from '../store/app';
import { Request, Response } from 'express';

/**
 * App infos router.
 */
const router = express.Router();

/**
 * Get app infos.
 * @param req the request
 * @param res the response
 */
function getAppInfos(_req: Request, res: Response) {
    res.status(200).json(storeApp.getAppInfos());
}
/**
 * Init Router.
 */
export function init() {
    router.use(nocache());
    router.get('/', getAppInfos);
    return router;
}

