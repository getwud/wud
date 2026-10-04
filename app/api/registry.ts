import express from 'express';
import { timingSafeEqual } from 'crypto';
import * as registry from '../registry';
import * as store from '../store/container';
import * as event from '../event';
import { Container } from '../model/container';
import { RegistryPushHint } from '../registries/Registry';
import logger from '../log';
import * as component from './component';

const log = logger.child({ component: 'registry-event' });

export function getRegistries(req, res) {
    return component.getAll(req, res, 'registry');
}

export function getRegistry(req, res) {
    return component.getById(req, res, 'registry');
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    return component.init('registry');
}
export function matches(
    container: Container,
    hint: RegistryPushHint,
    registryId: string,
): boolean {
    try {
        const host = new URL(container.image.registry.url).host.toLowerCase();
        return (
            container.image.registry.name === registryId &&
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

export function initEvents() {
    const router = express.Router();
    const recent = new Map<string, number>();
    const pending = new Set<string>();
    let queue = Promise.resolve();
    router.post(
        '/:name/events',
        (req, res, next) => {
            const provider = registry.getState().registry[req.params.name];
            const token = provider?.configuration?.webhook?.token;
            if (!token) {
                res.sendStatus(404);
                return;
            }
            const actual = Buffer.from(req.get('Authorization') || '');
            const expected = Buffer.from(`Bearer ${token}`);
            if (
                actual.length !== expected.length ||
                !timingSafeEqual(actual, expected)
            ) {
                res.sendStatus(401);
                return;
            }
            res.locals.registry = provider;
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
            let hints: RegistryPushHint[];
            try {
                hints = res.locals.registry.parseWebhook(req.body);
            } catch {
                log.warn('Malformed registry notification');
                res.sendStatus(400);
                return;
            }
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
                                    matches(container, hint, req.params.name),
                                ),
                        ),
                    );
                    const checked = new Set<string>();
                    for (const watcher of watchers) {
                        const fresh = await watcher.getContainers();
                        const selected = fresh.filter((container) =>
                            unique.some(({ hint }) =>
                                matches(container, hint, req.params.name),
                            ),
                        );
                        const reports =
                            await watcher.processWatchContainers(selected);
                        unique.forEach(({ key, hint }) => {
                            if (
                                reports.some((report) =>
                                    matches(
                                        report.container,
                                        hint,
                                        req.params.name,
                                    ),
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
