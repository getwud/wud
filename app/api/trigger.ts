import express, { Request, Response } from 'express';
import nocache from 'nocache';
import joi from 'joi';
import { byValues, byString } from 'sort-es';
import * as registry from '../registry';
import { requireRole } from './rbac';
import logger from '../log';
import Trigger from '../triggers/providers/Trigger';
import { Container } from '../model/container';

const log = logger.child({ component: 'trigger' });

const SAFE_ID_REGEX = /^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SAFE_IDENTIFIER_REGEX = /^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const SAFE_TAG_REGEX = /^(?!.*\.\.)[a-zA-Z0-9_][a-zA-Z0-9._:-]{0,255}$/;
const SAFE_IMAGE_NAME_REGEX = /^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9._/-]{0,255}$/;
const SAFE_IMAGE_ID_REGEX = /^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,511}$/;
const SAFE_TEXT_REGEX = /^[^\p{Cc}]*$/u;

const safeIdentifier = joi.string().pattern(SAFE_IDENTIFIER_REGEX).allow('');
const safeTag = joi.string().pattern(SAFE_TAG_REGEX).allow('');
const httpUri = joi
    .string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .allow('');

export const runTriggerContainerSchema = joi
    .object({
        id: joi.string().pattern(SAFE_ID_REGEX).default('123456789'),
        name: joi.string().pattern(SAFE_IDENTIFIER_REGEX).required(),
        displayName: joi.string().max(256).pattern(SAFE_TEXT_REGEX).allow(''),
        displayIcon: joi
            .string()
            .max(128)
            .pattern(/^[a-zA-Z0-9:_-]+$/)
            .allow(''),
        status: joi
            .string()
            .max(64)
            .pattern(/^[a-zA-Z0-9._-]+$/)
            .allow(''),
        watcher: joi.string().pattern(SAFE_IDENTIFIER_REGEX).default('local'),
        isOfficial: joi.boolean(),
        stack: safeIdentifier,
        documentationUrl: httpUri,
        changelogUrl: httpUri,
        upstreamUrl: httpUri,
        link: httpUri,
        updateAvailable: joi.boolean().default(true),
        overrideCooldown: joi.boolean(),
        updateEvent: joi
            .string()
            .valid('available', 'pre', 'success', 'failure'),
        updateKind: joi
            .object({
                kind: joi
                    .string()
                    .valid('tag', 'digest', 'unknown')
                    .default('tag'),
                localValue: safeTag,
                remoteValue: safeTag,
                semverDiff: joi
                    .string()
                    .valid(
                        'major',
                        'minor',
                        'patch',
                        'prerelease',
                        'rebuild',
                        'same',
                        'unknown',
                    )
                    .allow(''),
            })
            .default({ kind: 'tag' }),
        result: joi.object({
            tag: safeTag,
            digest: safeTag,
            created: joi.string().isoDate().allow(''),
            version: safeTag,
            link: httpUri,
            changelogUrl: httpUri,
        }),
        image: joi.object({
            id: joi.string().pattern(SAFE_IMAGE_ID_REGEX).allow(''),
            name: joi.string().pattern(SAFE_IMAGE_NAME_REGEX).allow(''),
            registry: joi.object({ name: safeIdentifier, url: httpUri }),
            tag: joi.object({ value: safeTag, semver: joi.boolean() }),
            digest: joi.object({
                watch: joi.boolean(),
                value: safeTag,
                repo: safeTag,
            }),
            architecture: safeIdentifier,
            os: safeIdentifier,
            variant: safeIdentifier,
            created: joi.string().isoDate().allow(''),
            version: safeTag.allow(null),
        }),
    })
    .options({
        stripUnknown: { objects: true },
        abortEarly: false,
        convert: true,
    });

interface TriggerApiItem {
    id: string;
    type: string;
    name: string;
    configuration: Record<string, unknown>;
    supportsSimulation: boolean;
}

function mapTriggerToItem(id: string, trigger: Trigger): TriggerApiItem {
    return {
        id,
        type: trigger.type,
        name: trigger.name,
        configuration: trigger.maskConfiguration(),
        supportsSimulation:
            typeof trigger.supportsSimulation === 'function'
                ? trigger.supportsSimulation()
                : false,
    };
}

export function getTriggers(_req: Request, res: Response) {
    const triggers = (registry.getState().trigger || {}) as Record<
        string,
        Trigger
    >;
    const list = Object.keys(triggers)
        .map((key) => mapTriggerToItem(key, triggers[key]))
        .sort(
            byValues([
                [(x: TriggerApiItem) => x.type, byString()],
                [(x: TriggerApiItem) => x.name, byString()],
            ]),
        );
    res.status(200).json(list);
}

export function getTrigger(req: Request, res: Response) {
    const { type, name } = req.params;
    const id = `${type}.${name}`;
    const triggers = (registry.getState().trigger || {}) as Record<
        string,
        Trigger
    >;
    const trigger = triggers[id];
    if (trigger) {
        res.status(200).json(mapTriggerToItem(id, trigger));
    } else {
        res.sendStatus(404);
    }
}

/**
 * Run a specific notification trigger on a validated simulation container payload.
 */
export async function runTrigger(req: Request, res: Response) {
    const triggerType = req.params.type;
    const triggerName = req.params.name;

    const triggers = (registry.getState().trigger || {}) as Record<
        string,
        Trigger
    >;
    const triggerToRun = triggers[`${triggerType}.${triggerName}`];
    if (!triggerToRun) {
        log.warn(`No trigger found(type=${triggerType}, name=${triggerName})`);
        res.status(404).json({
            error: 'Not found',
            message: `Error when running trigger ${triggerType}.${triggerName} (trigger not found)`,
        });
        return;
    }

    if (
        typeof triggerToRun.supportsSimulation !== 'function' ||
        !triggerToRun.supportsSimulation()
    ) {
        log.warn(
            `Refusing to simulate non-notification trigger (type=${triggerType}, name=${triggerName})`,
        );
        res.status(403).json({
            error: 'Forbidden',
            message: `Trigger ${triggerType}.${triggerName} does not support test simulation`,
        });
        return;
    }

    const rawContainer = req.body;
    if (
        !rawContainer ||
        typeof rawContainer !== 'object' ||
        Array.isArray(rawContainer)
    ) {
        log.warn(
            `Trigger cannot be executed without valid container object (type=${triggerType}, name=${triggerName})`,
        );
        res.status(400).json({
            error: 'Bad Request',
            message: `Error when running trigger ${triggerType}.${triggerName} (container is undefined)`,
        });
        return;
    }

    const { error, value } = runTriggerContainerSchema.validate(rawContainer);
    if (error) {
        log.warn(
            `Invalid container payload for trigger simulation (type=${triggerType}, name=${triggerName}): ${error.message}`,
        );
        res.status(400).json({
            error: 'Bad Request',
            message: `Invalid container payload (${error.message})`,
        });
        return;
    }

    const sanitizedContainer = value as Container;
    sanitizedContainer.result = sanitizedContainer.result || {};
    if (
        sanitizedContainer.updateKind?.kind === 'tag' &&
        !sanitizedContainer.result.tag &&
        sanitizedContainer.updateKind.remoteValue
    ) {
        sanitizedContainer.result.tag =
            sanitizedContainer.updateKind.remoteValue;
    } else if (
        sanitizedContainer.updateKind?.kind === 'digest' &&
        !sanitizedContainer.result.digest &&
        sanitizedContainer.updateKind.remoteValue
    ) {
        sanitizedContainer.result.digest =
            sanitizedContainer.updateKind.remoteValue;
    }

    const overrideCooldown =
        req.query?.overrideCooldown === 'true' ||
        req.query?.overrideCooldown === (true as unknown) ||
        sanitizedContainer.overrideCooldown === true;
    if (overrideCooldown) {
        sanitizedContainer.overrideCooldown = true;
    } else {
        delete sanitizedContainer.overrideCooldown;
    }

    try {
        await triggerToRun.trigger(sanitizedContainer);
        log.info(
            `Trigger executed with success (type=${triggerType}, name=${triggerName}, container=${JSON.stringify(sanitizedContainer)})`,
        );
        res.status(200).json({});
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.warn(
            `Error when running trigger ${triggerType}.${triggerName} (${message})`,
        );
        res.status(500).json({
            error: 'Trigger execution failed',
            message: `Error when running trigger ${triggerType}.${triggerName} (${message})`,
        });
    }
}

/**
 * Init Router.
 */
export function init() {
    const router = express.Router();
    router.use(nocache());
    router.get('/', getTriggers);
    router.get('/:type/:name', getTrigger);
    router.post(
        '/:type/:name',
        requireRole(['admin', 'rw'], 'write'),
        runTrigger,
    );
    return router;
}
