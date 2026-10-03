import express from 'express';
import { timingSafeEqual } from 'crypto';
import joi from 'joi';
import { get, wudEnvVars } from '../configuration';
import * as registry from '../registry';
import * as store from '../store/container';
import * as event from '../event';
import { Container } from '../model/container';
import logger from '../log';

const log = logger.child({ component: 'registry-event' });
const hostPattern = /^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/;
const receiverSchema = joi.object({
    enabled: joi.boolean().default(false),
    token: joi.string().when('enabled', { is: true, then: joi.required() }),
    registry: joi.string().pattern(hostPattern),
});

export interface ReceiverConfiguration {
    enabled: boolean;
    token?: string;
    registry?: string;
}

export function getConfigurations(): Record<string, ReceiverConfiguration> {
    const schema = joi.object({
        gitlab: joi
            .object()
            .pattern(/^[a-z0-9-]+$/, receiverSchema)
            .default({}),
    });
    const result = schema.validate(get('wud.event', wudEnvVars));
    if (result.error) throw result.error;
    return result.value.gitlab;
}

export interface PushHint {
    host: string;
    repository: string;
    tag: string;
    digest: string;
}

const manifestTypes = new Set([
    'application/vnd.docker.distribution.manifest.v2+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.oci.image.index.v1+json',
]);
const envelopeSchema = joi
    .object({
        events: joi
            .array()
            .max(100)
            .items(
                joi
                    .object({
                        action: joi.string().required(),
                        target: joi.object().required().unknown(true),
                        request: joi.object().unknown(true),
                    })
                    .unknown(true),
            )
            .required(),
    })
    .unknown(true);
const pushSchema = joi
    .object({
        repository: joi
            .string()
            .pattern(
                /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*)*$/,
            )
            .max(255)
            .required(),
        tag: joi
            .string()
            .pattern(/^[\w][\w.-]{0,127}$/)
            .required(),
        digest: joi
            .string()
            .pattern(/^sha256:[a-fA-F0-9]{64}$/)
            .required(),
        mediaType: joi.string().required(),
        url: joi.string().uri({ scheme: ['http', 'https'] }),
    })
    .unknown(true);

export function parseHints(body: unknown): PushHint[] {
    const envelope = envelopeSchema.validate(body);
    if (envelope.error) throw envelope.error;
    const hints: PushHint[] = [];
    for (const item of envelope.value.events) {
        if (
            item.action !== 'push' ||
            !manifestTypes.has(item.target.mediaType) ||
            !item.target.tag
        )
            continue;
        const target = pushSchema.validate(item.target);
        if (target.error) throw target.error;
        let host: string;
        if (target.value.url) {
            const url = new URL(target.value.url);
            if (url.username || url.password)
                throw new Error('Invalid registry URL');
            host = url.host;
        } else {
            host = item.request?.host;
        }
        if (!host || !hostPattern.test(host))
            throw new Error('Invalid registry host');
        hints.push({
            host: host.toLowerCase(),
            repository: target.value.repository,
            tag: target.value.tag,
            digest: target.value.digest,
        });
    }
    return hints;
}

export function matches(container: Container, hint: PushHint): boolean {
    try {
        const host = new URL(container.image.registry.url).host.toLowerCase();
        return (
            host === hint.host &&
            container.image.name === hint.repository &&
            container.image.tag.value === hint.tag
        );
    } catch {
        return false;
    }
}

// Successful hints expire; pending hints are bounded and reserved before any await.
const ttl = 60_000;
const capacity = 1000;

export function init(configurations = getConfigurations()) {
    const router = express.Router();
    const recent = new Map<string, number>();
    const pending = new Set<string>();
    let queue = Promise.resolve();
    router.post(
        '/gitlab/:name',
        (req, res, next) => {
            const configuration = configurations[req.params.name];
            if (!configuration?.enabled) {
                res.sendStatus(404);
                return;
            }
            const actual = Buffer.from(req.get('Authorization') || '');
            const expected = Buffer.from(`Bearer ${configuration.token}`);
            if (
                actual.length !== expected.length ||
                !timingSafeEqual(actual, expected)
            ) {
                res.sendStatus(401);
                return;
            }
            next();
        },
        express.json({
            limit: '256kb',
            type: [
                'application/json',
                'application/vnd.docker.distribution.events.v2+json',
            ],
        }),
        async (req, res) => {
            let hints: PushHint[];
            try {
                hints = parseHints(req.body);
            } catch {
                log.warn('Malformed registry notification');
                res.sendStatus(400);
                return;
            }
            const configuration = configurations[req.params.name];
            hints = hints.filter(
                (hint) =>
                    !configuration.registry ||
                    hint.host === configuration.registry.toLowerCase(),
            );
            for (const [key, expires] of recent)
                if (expires <= Date.now()) recent.delete(key);
            const accepted = hints
                .map((hint) => ({
                    hint,
                    key: JSON.stringify([
                        req.params.name,
                        hint.host,
                        hint.repository,
                        hint.tag,
                        hint.digest,
                    ]),
                }))
                .filter(({ key }) => !recent.has(key) && !pending.has(key));
            const unique = [
                ...new Map(accepted.map((item) => [item.key, item])).values(),
            ];
            if (unique.length === 0) {
                log.debug(
                    'Registry notification ignored (duplicate or unrelated event)',
                );
                res.status(202).json({ accepted: 0 });
                return;
            }
            if (pending.size + unique.length > capacity) {
                res.sendStatus(429);
                return;
            }
            unique.forEach(({ key }) => pending.add(key));
            const task = queue.then(async () => {
                try {
                    const stored = store.getContainers({});
                    const watchers = Object.values(
                        registry.getState().watcher,
                    ).filter((watcher) =>
                        stored.some(
                            (container) =>
                                container.watcher === watcher.name &&
                                unique.some(({ hint }) =>
                                    matches(container, hint),
                                ),
                        ),
                    );
                    const checked = new Set<string>();
                    for (const watcher of watchers) {
                        const fresh = await watcher.getContainers();
                        const selected = fresh.filter((container) =>
                            unique.some(({ hint }) => matches(container, hint)),
                        );
                        const reports =
                            await watcher.processWatchContainers(selected);
                        unique.forEach(({ key, hint }) => {
                            if (
                                reports.some((report) =>
                                    matches(report.container, hint),
                                )
                            )
                                checked.add(key);
                        });
                        event.emitContainerReports(reports);
                        if (reports.some((report) => report.container.error))
                            throw new Error('Registry check failed');
                    }
                    checked.forEach((key) => recent.set(key, Date.now() + ttl));
                    if (checked.size === 0)
                        log.debug(
                            'No watched containers matched registry notification',
                        );
                    while (recent.size > capacity)
                        recent.delete(recent.keys().next().value);
                } catch {
                    log.warn(
                        'Registry notification check failed; polling remains available',
                    );
                } finally {
                    unique.forEach(({ key }) => pending.delete(key));
                }
            });
            queue = task;
            res.status(202).json({ accepted: unique.length });
        },
    );
    return router;
}
