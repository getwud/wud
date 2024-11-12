const express = require('express');
const nocache = require('nocache');
const storeContainer = require('../store/container');
const registry = require('../registry');
const { getServerConfiguration, getTriggerConfigurations } = require('../configuration');
const HttpTrigger = require('../triggers/providers/http/Http');

const router = express.Router();

const serverConfiguration = getServerConfiguration();
const triggerConfigurations = getTriggerConfigurations();

/**
 * Return registered watchers.
 * @returns {{id: string}[]}
 */
function getWatchers() {
    return registry.getState().watcher;
}

/**
 * Get containers from store.
 * @param query
 * @returns {*}
 */
function getContainersFromStore(query) {
    return storeContainer.getContainers(query);
}

/**
 * Get all (filtered) containers.
 * @param req
 * @param res
 */
function getContainers(req, res) {
    const { query } = req;
    const containers = getContainersFromStore(query);

    // Access the 'install' flag from the Http trigger configuration
    const httpTriggers = triggerConfigurations && triggerConfigurations.http;

    console.log('Trigger Configurations:', JSON.stringify(triggerConfigurations, null, 2));
    console.log('HTTP Triggers:', JSON.stringify(httpTriggers, null, 2));

    let installEnabled = false;

    if (httpTriggers) {
        // Collect all trigger names that have install enabled
        const triggersWithInstall = Object.keys(httpTriggers).filter((triggerName) => {
            const triggerConfig = httpTriggers[triggerName];
            const installValue = String(triggerConfig.install).toLowerCase();
            return installValue === 'true';
        });

        if (triggersWithInstall.length === 1) {
            // Only one trigger has install enabled
            installEnabled = true;
        } else if (triggersWithInstall.length > 1) {
            // More than one trigger has install enabled
            installEnabled = 'multiple';
            console.warn('Multiple triggers have install enabled; install action will be disabled.');
        }
        // If no triggers have install enabled, installEnabled remains false
    }

    const containersWithInstallFlag = containers.map((container) => ({
        ...container,
        install: installEnabled,
    }));

    res.status(200).json(containersWithInstallFlag);
}

/**
 * Get a container by id.
 * @param req
 * @param res
 */
function getContainer(req, res) {
    const { id } = req.params;
    const container = storeContainer.getContainer(id);
    if (container) {
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
function deleteContainer(req, res) {
    if (!serverConfiguration.feature.delete) {
        res.sendStatus(403);
    } else {
        const { id } = req.params;
        const container = storeContainer.getContainer(id);
        if (container) {
            storeContainer.deleteContainer(id);
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
async function watchContainers(req, res) {
    try {
        await Promise.all(Object.values(getWatchers()).map((watcher) => watcher.watch()));
        getContainers(req, res);
    } catch (e) {
        res.status(500).json({
            error: `Error when watching images (${e.message})`,
        });
    }
}

/**
 * Watch an image.
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
async function watchContainer(req, res) {
    const { id } = req.params;

    const container = storeContainer.getContainer(id);
    if (container) {
        const watcher = getWatchers()[`watcher.docker.${container.watcher}`];
        if (!watcher) {
            res.status(500).json({
                error: `No provider found for container ${id} and provider ${container.watcher}`,
            });
        } else {
            try {
                // Ensure container is still in store
                // (for cases where it has been removed before running an new watchAll)
                const containers = await watcher.getContainers();
                const containerFound = containers
                    .find((containerInList) => containerInList.id === container.id);

                if (!containerFound) {
                    res.status(404).send();
                } else {
                    // Run watchContainer from the Provider
                    const containerReport = await watcher.watchContainer(container);
                    res.status(200).json(containerReport.container);
                }
            } catch (e) {
                res.status(500).json({
                    error: `Error when watching container ${id} (${e.message})`,
                });
            }
        }
    } else {
        res.sendStatus(404);
    }
}

/**
 * Install a container by id.
 * @param req
 * @param res
 */
// MODIFICATION START: Add installContainer function
async function installContainer(req, res) {
    const { id } = req.params;

    // Access all HTTP triggers from the trigger configurations
    const httpTriggers = triggerConfigurations && triggerConfigurations.http;

    let httpTriggerConfig = null;
    let triggersWithInstall = [];

    if (httpTriggers) {
        // Collect all trigger configurations that have install enabled
        triggersWithInstall = Object.keys(httpTriggers).filter((triggerName) => {
            const triggerConfig = httpTriggers[triggerName];
            const installValue = String(triggerConfig.install).toLowerCase();
            return installValue === 'true';
        });
    }

    if (triggersWithInstall.length === 0) {
        // No triggers have install enabled
        return res.status(403).json({ error: 'Install not enabled' });
    } else if (triggersWithInstall.length > 1) {
        // Multiple triggers have install enabled
        return res.status(400).json({ error: 'Multiple install triggers are configured. Please ensure only one trigger has install enabled.' });
    } else {
        // Exactly one trigger has install enabled
        const triggerName = triggersWithInstall[0];
        httpTriggerConfig = httpTriggers[triggerName];
    }

    const container = storeContainer.getContainer(id);
    if (container) {
        try {
            const triggerName = triggersWithInstall[0];
            const httpTrigger = new HttpTrigger(triggerName, httpTriggerConfig);
            await httpTrigger.install(container);
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({
                error: `Error when installing container ${id} (${e.message})`,
            });
        }
    } else {
        res.sendStatus(404);
    }
}
// MODIFICATION END

/**
 * Init Router.
 * @returns {*}
 */
function init() {
    router.use(nocache());
    router.get('/', getContainers);
    router.post('/watch', watchContainers);
    router.get('/:id', getContainer);
    router.delete('/:id', deleteContainer);
    router.post('/:id/watch', watchContainer);
    router.post('/:id/install', installContainer); // MODIFICATION: Add route for installContainer
    return router;
}

module.exports = {
    init,
    getContainersFromStore,
};
