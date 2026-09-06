// @ts-nocheck
import * as component from './component';
import * as registry from '../registry';
import logger from '../log';
const log = logger.child({ component: 'trigger' });

export function getTriggers(req, res) {
    return component.getAll(req, res, 'trigger');
}

export function getTrigger(req, res) {
    return component.getById(req, res, 'trigger');
}

/**
 * Run a specific trigger on a specific container provided in the payload.
 * @param {*} req
 * @param {*} res
 * @returns
 */
export async function runTrigger(req, res) {
    const triggerType = req.params.type;
    const triggerName = req.params.name;
    const containerToTrigger = req.body;

    const triggerToRun =
        registry.getState().trigger[`${triggerType}.${triggerName}`];
    if (!triggerToRun) {
        log.warn(`No trigger found(type=${triggerType}, name=${triggerName})`);
        res.status(404).json({
            error: 'Not found',
            message: `Error when running trigger ${triggerType}.${triggerName} (trigger not found)`,
        });
        return;
    }
    if (!containerToTrigger) {
        log.warn(
            `Trigger cannot be executed without container (type=${triggerType}, name=${triggerName})`,
        );
        res.status(400).json({
            error: 'Bad Request',
            message: `Error when running trigger ${triggerType}.${triggerName} (container is undefined)`,
        });
        return;
    }

    try {
        await triggerToRun.trigger(containerToTrigger);
        log.info(
            `Trigger executed with success (type=${triggerType}, name=${triggerName}, container=${JSON.stringify(containerToTrigger)})`,
        );
        res.status(200).json({});
    } catch (e) {
        log.warn(
            `Error when running trigger ${triggerType}.${triggerName} (${e.message})`,
        );
        res.status(500).json({
            error: 'Trigger execution failed',
            message: `Error when running trigger ${triggerType}.${triggerName} (${e.message})`,
        });
    }
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    const router = component.init('trigger');
    router.post('/:type/:name', runTrigger);
    return router;
}
