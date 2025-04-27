/**
 * Registry handling all components (registries, triggers, watchers).
 */
import logger from '../log';
import { Component, ComponentKind } from './Component';
import { getWatcherConfigurations, getTriggerConfigurations, getRegistryConfigurations, getAuthenticationConfigurations, BaseConfiguration } from '../configuration';
import { Trigger } from '../triggers/providers/Trigger';
import { states, getState } from './states';
import capitalize from 'capitalize';

export const log = logger.child({ component: 'registry' });


/**
 * Register a component.
 */
export async function registerComponent(kind: ComponentKind, provider: string, name: string, configuration: any, path: string): Promise<Component> {
    const providerLowercase = provider.toLowerCase();
    const nameLowercase = name.toLowerCase();
    const componentFile = `${path}/${providerLowercase.toLowerCase()}/${capitalize(provider)}`;
    try {
        const componentType = await import(componentFile);
        const component = new componentType[capitalize(provider)]();
        const componentRegistered = await component.register(
            kind,
            providerLowercase,
            nameLowercase,
            configuration,
        );
        states[kind][component.getId()] = component as any;
        return componentRegistered;
    } catch (e: any) {
        console.log(e);
        throw new Error(
            `Error when registering component ${providerLowercase} (${e.message})`,
        );
    }
}

/**
 * Register all found components.
 */
export async function registerComponents(kind: ComponentKind, configurations: BaseConfiguration, path: string) {
    if (configurations) {
        const providers = Object.keys(configurations);
        const providerPromises = providers
            .map((provider) => {
                log.info(
                    `Register all components of kind ${kind} for provider ${provider}`,
                );
                const providerConfigurations = configurations[provider];
                if (!providerConfigurations) {
                    throw new Error(`No configurations found for provider ${provider}`);
                }
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
export async function registerWatchers() {
    const configurations = getWatcherConfigurations();
    let watchersToRegister: Promise<Component>[] = [];
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
export async function registerTriggers() {
    const configurations = getTriggerConfigurations();
    try {
        await registerComponents(
            'trigger',
            configurations,
            '../triggers/providers'
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
export async function registerRegistries() {
    const defaultRegistries = {
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
export async function registerAuthentications() {
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
 */
export async function deregisterComponent(component: Component, kind: ComponentKind) {
    try {
        await component.deregister();
    } catch (e: any) {
        throw new Error(
            `Error when deregistering component ${component.getId()} (${e.message})`,
        );
    } finally {
        const components = states[kind];
        if (components) {
            delete components[component.getId()];
        }
    }
}

/**
 * Deregister all components of kind.
 * @param components
 * @param kind
 */
export async function deregisterComponents<T extends Component<any>>(components: T[], kind: ComponentKind) {
    const deregisterPromises = components.map(async (component) =>
        deregisterComponent(component, kind),
    );
    return Promise.all(deregisterPromises);
}

/**
 * Deregister all watchers.
 */
export async function deregisterWatchers() {
    return deregisterComponents(Object.values(getState().watcher), 'watcher');
}

/**
 * Deregister all triggers.
 */
export async function deregisterTriggers() {
    return deregisterComponents<Trigger>(Object.values(getState().trigger), 'trigger');
}

/**
 * Deregister all registries.
 */
export async function deregisterRegistries() {
    return deregisterComponents(Object.values(getState().registry), 'registry');
}

/**
 * Deregister all authentications.
 */
export async function deregisterAuthentications() {
    return deregisterComponents(
        Object.values(getState().authentication),
        'authentication',
    );
}

/**
 * Deregister all components.
 */
export async function deregisterAll() {
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
