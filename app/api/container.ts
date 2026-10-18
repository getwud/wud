// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import * as storeContainer from '../store/container';
import * as registry from '../registry';
import { getServerConfiguration } from '../configuration';
import { mapComponentsToList } from './component';
import { getAssociatedTriggerIds } from '../triggers/associatedTriggers';
import { requireRole } from './rbac';
import { getRemoteMetadataProvider } from '../metadata';
import logger from '../log';
const log = logger.child({ component: 'container' });

const router = express.Router();

const serverConfiguration = getServerConfiguration();

/**
 * Return registered watchers.
 * @returns {{id: string}[]}
 */
function getWatchers() {
    return registry.getState().watcher;
}

/**
 * Return registered triggers.
 * @returns {{id: string}[]}
 */
function getTriggers() {
    return registry.getState().trigger;
}

function attachHubMetadata(container) {
    if (!container) return container;
    try {
        const metadataProvider = getRemoteMetadataProvider();
        const hub = metadataProvider.getContainerMetadata(container.id);
        if (hub) {
            container.hub = hub;
        }
        if (
            container.result &&
            container.result.tag &&
            container.image?.name &&
            container.image?.tag?.value
        ) {
            const cachedRisk = metadataProvider.getCachedRiskAnalysis(
                container.image.name,
                container.image.tag.value,
                container.result.tag,
            );
            if (cachedRisk) {
                container.result.riskAnalysis = cachedRisk;
            }
        }
    } catch {
        // Ignore if metadata provider not available
    }
    return container;
}

/**
 * Get containers from store.
 * @param query
 * @returns {*}
 */
export function getContainersFromStore(query) {
    const containers = storeContainer.getContainers(query);
    try {
        const metadataProvider = getRemoteMetadataProvider();
        return containers.map((c) => {
            const hub = metadataProvider.getContainerMetadata(c.id);
            if (hub) {
                c.hub = hub;
            }
            if (
                c.result &&
                c.result.tag &&
                c.image?.name &&
                c.image?.tag?.value
            ) {
                const cachedRisk = metadataProvider.getCachedRiskAnalysis(
                    c.image.name,
                    c.image.tag.value,
                    c.result.tag,
                );
                if (cachedRisk) {
                    c.result.riskAnalysis = cachedRisk;
                }
            }
            return c;
        });
    } catch {
        return containers;
    }
}

/**
 * Get all (filtered) containers.
 * @param req
 * @param res
 */
export function getContainers(req, res) {
    const { query } = req;
    res.status(200).json(getContainersFromStore(query));
}

/**
 * Get a container by id.
 * @param req
 * @param res
 */
export function getContainer(req, res) {
    const { id } = req.params;
    const container = storeContainer.getContainer(id);
    if (container) {
        attachHubMetadata(container);
        res.status(200).json(container);
    } else {
        res.sendStatus(404);
    }
}

/**
 * Delete a container by id.
 * @param req
 * @param res
 */
export function deleteContainer(req, res) {
    if (!serverConfiguration.feature.delete) {
        res.sendStatus(403);
    } else {
        const { id } = req.params;
        const container = storeContainer.getContainer(id);
        if (container) {
            storeContainer.deleteContainer(id);
            try {
                getRemoteMetadataProvider().deleteContainerMetadata(id);
            } catch {
                // Ignore
            }
            res.sendStatus(204);
        } else {
            res.sendStatus(404);
        }
    }
}

/**
 * Watch all containers.
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
let currentWatchJobId = null;

export async function watchContainers(req, res) {
    const isAsync = req.query.async === 'true';

    try {
        if (!isAsync) {
            await Promise.all(
                Object.values(getWatchers()).map((watcher) => watcher.watch()),
            );
            return getContainers(req, res);
        }

        if (currentWatchJobId) {
            return res
                .status(202)
                .json({ status: 'started', jobId: currentWatchJobId });
        }

        currentWatchJobId = require('crypto').randomUUID();
        const jobId = currentWatchJobId;

        res.status(202).json({ status: 'started', jobId });

        // Run async
        (async () => {
            try {
                await Promise.all(
                    Object.values(getWatchers()).map((watcher) =>
                        watcher.watch(),
                    ),
                );
            } catch (err) {
                log.error(`Error in background watch: ${err.message}`);
            } finally {
                if (currentWatchJobId === jobId) {
                    currentWatchJobId = null;
                }
            }
        })();
    } catch (e) {
        res.status(500).json({
            error: `Error when watching images (${e.message})`,
            message: e.message,
        });
    }
}

export async function getContainerTriggers(req, res) {
    const { id } = req.params;

    const container = storeContainer.getContainer(id);
    if (container) {
        const associatedTriggerIds = getAssociatedTriggerIds(container);
        const associatedTriggers = mapComponentsToList(getTriggers())
            .filter((trigger) => associatedTriggerIds.has(trigger.id))
            .map((trigger) => {
                const threshold = associatedTriggerIds.get(trigger.id);
                if (threshold === undefined) {
                    return trigger;
                }
                return {
                    ...trigger,
                    configuration: { ...trigger.configuration, threshold },
                };
            });
        res.status(200).json(associatedTriggers);
    } else {
        res.sendStatus(404);
    }
}

/**
 * Run trigger for a specific container.
 * @param {*} req
 * @param {*} res
 */
export async function runTriggerForContainer(req, res) {
    const { id, triggerType, triggerName } = req.params;

    const containerToTrigger = storeContainer.getContainer(id);
    if (containerToTrigger) {
        const triggerToRun = getTriggers()[`${triggerType}.${triggerName}`];
        if (triggerToRun) {
            try {
                await triggerToRun.trigger(containerToTrigger);
                log.info(
                    `Trigger executed with success (type=${triggerType}, name=${triggerName}, container=${JSON.stringify(containerToTrigger)})`,
                );
                res.status(200).json({});
            } catch (e) {
                log.warn(
                    `Error when running trigger (type=${triggerType}, name=${triggerName}) (${e.message})`,
                );
                res.status(500).json({
                    error: 'Trigger execution failed',
                    message: `Error when running trigger (type=${triggerType}, name=${triggerName}) (${e.message})`,
                });
            }
        } else {
            res.status(404).json({
                error: 'Not found',
                message: 'Trigger not found',
            });
        }
    } else {
        res.status(404).json({
            error: 'Not found',
            message: 'Container not found',
        });
    }
}

/**
 * Watch an image.
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function watchContainer(req, res) {
    const { id } = req.params;

    const container = storeContainer.getContainer(id);
    if (container) {
        const watcher = getWatchers()[`docker.${container.watcher}`];
        if (!watcher) {
            res.status(500).json({
                error: 'Provider not found',
                message: `No provider found for container ${id} and provider ${container.watcher}`,
            });
        } else {
            try {
                // Ensure container is still in store
                // (for cases where it has been removed before running an new watchAll)
                const containers = await watcher.getContainers();
                const containerFound = containers.find(
                    (containerInList) => containerInList.id === container.id,
                );

                if (!containerFound) {
                    res.status(404).send();
                } else {
                    // Run watchContainer from the Provider
                    const containerReport =
                        await watcher.watchContainer(container);
                    res.status(200).json(containerReport.container);
                }
            } catch (e) {
                res.status(500).json({
                    error: 'Watch failed',
                    message: `Error when watching container ${id} (${e.message})`,
                });
            }
        }
    } else {
        res.sendStatus(404);
    }
}

/**
 * Snooze container updates.
 * @param req
 * @param res
 */
export function snoozeContainer(req, res) {
    const { id } = req.params;
    const container = storeContainer.getContainer(id);
    if (!container) {
        return res.sendStatus(404);
    }
    const { version, until } = req.body || {};
    const targetVersion =
        version || container.result?.tag || container.result?.digest;
    if (!targetVersion) {
        return res.status(400).json({
            error: 'Bad request',
            message: 'No candidate version to snooze',
        });
    }
    try {
        const updated = storeContainer.snoozeContainer(
            id,
            targetVersion,
            until,
        );
        attachHubMetadata(updated);
        return res.status(200).json(updated);
    } catch (e) {
        return res.status(500).json({
            error: 'Snooze failed',
            message: e.message,
        });
    }
}

/**
 * Unsnooze container updates.
 * @param req
 * @param res
 */
export function unsnoozeContainer(req, res) {
    const { id } = req.params;
    const container = storeContainer.getContainer(id);
    if (!container) {
        return res.sendStatus(404);
    }
    try {
        const updated = storeContainer.unsnoozeContainer(id);
        attachHubMetadata(updated);
        return res.status(200).json(updated);
    } catch (e) {
        return res.status(500).json({
            error: 'Unsnooze failed',
            message: e.message,
        });
    }
}

/**
 * Evaluate risk analysis for a container update candidate.
 * @param req
 * @param res
 */
export async function evaluateContainerRisk(req, res) {
    const { id } = req.params;
    const forceRefresh =
        req.query.forceRefresh === 'true' || req.body?.forceRefresh === true;

    const container = storeContainer.getContainer(id);
    if (!container) {
        return res.sendStatus(404);
    }

    if (!container.updateAvailable || !container.result?.tag) {
        return res.status(400).json({
            message: 'Container has no active update candidate to analyze',
        });
    }

    try {
        const metadataProvider = getRemoteMetadataProvider();
        const risk = await metadataProvider.getRiskAnalysis(
            container.image.name,
            container.image.tag.value,
            container.result.tag,
            forceRefresh,
        );

        if (!risk) {
            return res.status(503).json({
                message:
                    'Risk analysis unavailable (Hub offline, disabled, or rate-limited)',
            });
        }

        container.result.riskAnalysis = risk;
        try {
            storeContainer.updateContainer(container);
        } catch {
            // Ignore store update failure
        }
        return res.status(200).json(risk);
    } catch (err) {
        log.error(
            `Failed to evaluate risk for container ${id}: ${err.message}`,
        );
        return res.status(500).json({ message: err.message });
    }
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    router.use(nocache());
    router.get('/', requireRole(['admin', 'rw', 'ro'], 'read'), getContainers);
    router.post(
        '/watch',
        requireRole(['admin', 'rw'], 'write'),
        watchContainers,
    );
    router.get(
        '/:id',
        requireRole(['admin', 'rw', 'ro'], 'read'),
        getContainer,
    );
    router.delete(
        '/:id',
        requireRole(['admin', 'rw'], 'write'),
        deleteContainer,
    );
    router.post(
        '/:id/snooze',
        requireRole(['admin', 'rw'], 'write'),
        snoozeContainer,
    );
    router.delete(
        '/:id/snooze',
        requireRole(['admin', 'rw'], 'write'),
        unsnoozeContainer,
    );
    router.post(
        '/:id/risk-analysis',
        requireRole(['admin', 'rw'], 'write'),
        evaluateContainerRisk,
    );
    router.get(
        '/:id/triggers',
        requireRole(['admin', 'rw', 'ro'], 'read'),
        getContainerTriggers,
    );
    router.post(
        '/:id/triggers/:triggerType/:triggerName',
        requireRole(['admin', 'rw'], 'write'),
        runTriggerForContainer,
    );
    router.post(
        '/:id/watch',
        requireRole(['admin', 'rw'], 'write'),
        watchContainer,
    );
    return router;
}
