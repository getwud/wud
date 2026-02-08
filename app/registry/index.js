/**
 * Registry handling all components (registries, triggers, watchers).
 */
const capitalize = require('capitalize');
const fs = require('fs');
const path = require('path');
const log = require('../log').child({ component: 'registry' });
const {
    getWatcherConfigurations,
    getTriggerConfigurations,
    getRegistryConfigurations,
    getAuthenticationConfigurations,
} = require('../configuration');

/**
 * Registry state.
 */
const state = {
    trigger: {},
    watcher: {},
    registry: {},
    authentication: {},
};

function getState() {
    return state;
}

/**
 * Get available providers for a given component kind.
 * @param {string} basePath relative path to the providers directory
 * @returns {string[]} sorted list of available provider names
 */
function getAvailableProviders(basePath) {
    try {
        const resolvedPath = path.resolve(__dirname, basePath);
        const providers = fs
            .readdirSync(resolvedPath)
            .filter((file) => {
                const filePath = path.join(resolvedPath, file);
                return fs.statSync(filePath).isDirectory();
            })
            .sort();
        return providers;
    } catch (e) {
        return [];
    }
}

/**
 * Get documentation link for a component kind.
 * @param {string} kind component kind (trigger, watcher, etc.)
 * @returns {string} documentation path
 */
function getDocumentationLink(kind) {
    const docLinks = {
        trigger:
            'https://github.com/getwud/wud/tree/main/docs/configuration/triggers',
        watcher:
            'https://github.com/getwud/wud/tree/main/docs/configuration/watchers',
        registry:
            'https://github.com/getwud/wud/tree/main/docs/configuration/registries',
        authentication:
            'https://github.com/getwud/wud/tree/main/docs/configuration/authentications',
    };
    return (
        docLinks[kind] ||
        'https://github.com/getwud/wud/tree/main/docs/configuration'
    );
}

/**
 * Build error message when a component provider is not found.
 * @param {string} kind component kind (trigger, watcher, etc.)
 * @param {string} provider the provider name that was not found
 * @param {string} error the original error message
 * @param {string[]} availableProviders list of available providers
 * @returns {string} formatted error message
 */
function getHelpfulErrorMessage(kind, provider, error, availableProviders) {
    let message = `Error when registering component ${provider} (${error})`;

    if (error.includes('Cannot find module')) {
        const kindDisplay = kind.charAt(0).toUpperCase() + kind.slice(1);
        const envVarPattern = `WUD_${kindDisplay.toUpperCase()}_${provider.toUpperCase()}_*`;

        message = `Unknown ${kind} provider: '${provider}'.`;
        message += `\n  (Check your environment variables - this comes from: ${envVarPattern})`;

        if (availableProviders.length > 0) {
            message += `\n  Available ${kind} providers: ${availableProviders.join(', ')}`;
            const docLink = getDocumentationLink(kind);
            message += `\n  For more information, visit: ${docLink}`;
        }
    }

    return message;
}

/**
 * Register a component.
 *
 * @param {*} kind
 * @param {*} provider
 * @param {*} name
 * @param {*} configuration
 * @param {*} componentPath
 */
async function registerComponent(
    kind,
    provider,
    name,
    configuration,
    componentPath,
) {
    const providerLowercase = provider.toLowerCase();
    const nameLowercase = name.toLowerCase();
    const componentFile = `${componentPath}/${providerLowercase.toLowerCase()}/${capitalize(provider)}`;
    try {
        const Component = require(componentFile);
        const component = new Component();
        const componentRegistered = await component.register(
            kind,
            providerLowercase,
            nameLowercase,
            configuration,
        );
        state[kind][component.getId()] = component;
        return componentRegistered;
    } catch (e) {
        const availableProviders = getAvailableProviders(componentPath);
        const helpfulMessage = getHelpfulErrorMessage(
            kind,
            providerLowercase,
            e.message,
            availableProviders,
        );
        throw new Error(helpfulMessage);
    }
}

/**
 * Register all found components.
 * @param kind
 * @param configurations
 * @param path
 * @returns {*[]}
 */
async function registerComponents(kind, configurations, path) {
    if (configurations) {
        const providers = Object.keys(configurations);
        const providerPromises = providers
            .map((provider) => {
                log.info(
                    `Register all components of kind ${kind} for provider ${provider}`,
                );
                const providerConfigurations = configurations[provider];
                return Object.keys(providerConfigurations).map(
                    (configurationName) =>
                        registerComponent(
                            kind,
                            provider,
                            configurationName,
                            providerConfigurations[configurationName],
                            path,
                        ),
                );
            })
            .flat();
        return Promise.all(providerPromises);
    }
    return [];
}

/**
 * Register watchers.
 * @returns {Promise}
 */
async function registerWatchers() {
    const configurations = getWatcherConfigurations();
    let watchersToRegister = [];
    try {
        if (Object.keys(configurations).length === 0) {
            log.info(
                'No Watcher configured => Init a default one (Docker with default options)',
            );
            watchersToRegister.push(
                registerComponent(
                    'watcher',
                    'docker',
                    'local',
                    {},
                    '../watchers/providers',
                ),
            );
        } else {
            watchersToRegister = watchersToRegister.concat(
                Object.keys(configurations).map((watcherKey) => {
                    const watcherKeyNormalize = watcherKey.toLowerCase();
                    return registerComponent(
                        'watcher',
                        'docker',
                        watcherKeyNormalize,
                        configurations[watcherKeyNormalize],
                        '../watchers/providers',
                    );
                }),
            );
        }
        await Promise.all(watchersToRegister);
    } catch (e) {
        log.warn(`Some watchers failed to register (${e.message})`);
        log.debug(e);
    }
}

/**
 * Register triggers.
 */
async function registerTriggers() {
    const configurations = getTriggerConfigurations();
    try {
        await registerComponents(
            'trigger',
            configurations,
            '../triggers/providers',
        );
    } catch (e) {
        log.warn(`Some triggers failed to register (${e.message})`);
        log.debug(e);
    }
}

/**
 * Register registries.
 * @returns {Promise}
 */
async function registerRegistries() {
    const defaultRegistries = {
        codeberg: { public: '' },
        ecr: { public: '' },
        gcr: { public: '' },
        ghcr: { public: '' },
        hub: { public: '' },
        quay: { public: '' },
    };
    const registriesToRegister = {
        ...defaultRegistries,
        ...getRegistryConfigurations(),
    };

    try {
        await registerComponents(
            'registry',
            registriesToRegister,
            '../registries/providers',
        );
    } catch (e) {
        log.warn(`Some registries failed to register (${e.message})`);
        log.debug(e);
    }
}

/**
 * Register authentications.
 */
async function registerAuthentications() {
    const configurations = getAuthenticationConfigurations();
    try {
        if (Object.keys(configurations).length === 0) {
            log.info('No authentication configured => Allow anonymous access');
            await registerComponent(
                'authentication',
                'anonymous',
                'anonymous',
                {},
                '../authentications/providers',
            );
        }
        await registerComponents(
            'authentication',
            configurations,
            '../authentications/providers',
        );
    } catch (e) {
        log.warn(`Some authentications failed to register (${e.message})`);
        log.debug(e);
    }
}

/**
 * Deregister a component.
 * @param component
 * @param kind
 * @returns {Promise}
 */
async function deregisterComponent(component, kind) {
    try {
        await component.deregister();
    } catch (e) {
        throw new Error(
            `Error when deregistering component ${component.getId()} (${e.message})`,
        );
    } finally {
        const components = getState()[kind];
        if (components) {
            delete components[component.getId()];
        }
    }
}

/**
 * Deregister all components of kind.
 * @param components
 * @param kind
 * @returns {Promise}
 */
async function deregisterComponents(components, kind) {
    const deregisterPromises = components.map(async (component) =>
        deregisterComponent(component, kind),
    );
    return Promise.all(deregisterPromises);
}

/**
 * Deregister all watchers.
 * @returns {Promise}
 */
async function deregisterWatchers() {
    return deregisterComponents(Object.values(getState().watcher), 'watcher');
}

/**
 * Deregister all triggers.
 * @returns {Promise}
 */
async function deregisterTriggers() {
    return deregisterComponents(Object.values(getState().trigger), 'trigger');
}

/**
 * Deregister all registries.
 * @returns {Promise}
 */
async function deregisterRegistries() {
    return deregisterComponents(Object.values(getState().registry), 'registry');
}

/**
 * Deregister all authentications.
 * @returns {Promise<unknown>}
 */
async function deregisterAuthentications() {
    return deregisterComponents(
        Object.values(getState().authentication),
        'authentication',
    );
}

/**
 * Deregister all components.
 * @returns {Promise}
 */
async function deregisterAll() {
    try {
        await deregisterWatchers();
        await deregisterTriggers();
        await deregisterRegistries();
        await deregisterAuthentications();
    } catch (e) {
        throw new Error(`Error when trying to deregister ${e.message}`);
    }
}

async function init() {
    // Register triggers
    await registerTriggers();

    // Register registries
    await registerRegistries();

    // Register watchers
    await registerWatchers();

    // Register authentications
    await registerAuthentications();

    // Gracefully exit when possible
    process.on('SIGINT', deregisterAll);
    process.on('SIGTERM', deregisterAll);
}

module.exports = {
    init,
    getState,
};
