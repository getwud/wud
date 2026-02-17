/**
 * Registry handling all components (registries, triggers, watchers).
 */
import capitalize from 'capitalize';
import fs from 'fs';
import path from 'path';
import logger from '../log';
const log = logger.child({ component: 'registry' });
import {
    getWatcherConfigurations,
    getTriggerConfigurations,
    getRegistryConfigurations,
    getAuthenticationConfigurations,
} from '../configuration';
import Component, { ComponentConfiguration } from './Component';
import Trigger from '../triggers/providers/Trigger';
import Watcher from '../watchers/Watcher';
import Registry from '../registries/Registry';
import Authentication from '../authentications/providers/Authentication';

export interface RegistryState {
    trigger: { [key: string]: Trigger };
    watcher: { [key: string]: Watcher };
    registry: { [key: string]: Registry };
    authentication: { [key: string]: Authentication };
}

type ComponentKind = keyof RegistryState;

/**
 * Registry state.
 */
const state: RegistryState = {
    trigger: {},
    watcher: {},
    registry: {},
    authentication: {},
};

export function getState() {
    return state;
}

/**
 * Get available providers for a given component kind.
 * @param {string} basePath relative path to the providers directory
 * @returns {string[]} sorted list of available provider names
 */
function getAvailableProviders(basePath: string) {
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
function getDocumentationLink(kind: ComponentKind) {
    const docLinks: Record<ComponentKind, string> = {
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
function getHelpfulErrorMessage(
    kind: ComponentKind,
    provider: string,
    error: string,
    availableProviders: string[],
) {
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
    kind: ComponentKind,
    provider: string,
    name: string,
    configuration: ComponentConfiguration,
    componentPath: string,
): Promise<Component> {
    const providerLowercase = provider.toLowerCase();
    const nameLowercase = name.toLowerCase();
    const componentFile = `${componentPath}/${providerLowercase.toLowerCase()}/${capitalize(provider)}`;
    try {
        const ComponentClass = (await import(componentFile)).default;
        const component: Component = new ComponentClass();
        const componentRegistered = await component.register(
            kind,
            providerLowercase,
            nameLowercase,
            configuration,
        );

        // Type assertion is safe here because we know the kind matches the expected type
        // if the file structure and inheritance are correct
        (state[kind] as any)[component.getId()] = component;
        return componentRegistered;
    } catch (e: any) {
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
async function registerComponents(
    kind: ComponentKind,
    configurations: Record<string, any>,
    path: string,
) {
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
    let watchersToRegister: Promise<any>[] = [];
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
    } catch (e: any) {
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
    } catch (e: any) {
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
    } catch (e: any) {
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
    } catch (e: any) {
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
async function deregisterComponent(component: Component, kind: ComponentKind) {
    try {
        await component.deregister();
    } catch (e: any) {
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
async function deregisterComponents(
    components: Component[],
    kind: ComponentKind,
) {
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
    } catch (e: any) {
        throw new Error(`Error when trying to deregister ${e.message}`);
    }
}

export async function init() {
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

// The following exports are meant for testing only
export {
    registerComponent as testable_registerComponent,
    registerComponents as testable_registerComponents,
    registerRegistries as testable_registerRegistries,
    registerTriggers as testable_registerTriggers,
    registerWatchers as testable_registerWatchers,
    registerAuthentications as testable_registerAuthentications,
    deregisterComponent as testable_deregisterComponent,
    deregisterRegistries as testable_deregisterRegistries,
    deregisterTriggers as testable_deregisterTriggers,
    deregisterWatchers as testable_deregisterWatchers,
    deregisterAuthentications as testable_deregisterAuthentications,
    deregisterAll as testable_deregisterAll,
    log as testable_log,
};
