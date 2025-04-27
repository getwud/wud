import express, { Request, Response } from 'express';
import nocache from 'nocache';
import { getLogLevel } from '../configuration';

const router = express.Router();

/**
 * Get log infos.
 * @param req
 * @param res
 */
function getLog(req: Request, res: Response) {
    res.status(200).json({
        level: getLogLevel(),
    });
}

/**
 * Init Router.
 */
export function init() {
    router.use(nocache());
    router.get('/', getLog);
    return router;
}
