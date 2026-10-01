import Registry from './Registry';

/**
 * Calculate priority score for registry selection when matching an image URL.
 * Prioritizes configured/authenticated instances and specific matches over generic anonymous defaults.
 */
export function getRegistryPriority(
    provider: Registry,
    imageUrl: string,
): number {
    let score = 0;
    const config = (provider.configuration || {}) as Record<string, unknown>;

    // 1. Authenticated instances get highest priority (+100)
    const hasAuth = Boolean(
        config.login ||
            config.password ||
            config.token ||
            config.auth ||
            config.username ||
            config.clientid ||
            config.clientsecret ||
            config.apikey ||
            config.secretkey ||
            config.accesskeyid ||
            config.secretaccesskey,
    );
    if (hasAuth) {
        score += 100;
    }

    // 2. Custom named instances (not 'public') get priority over default 'public' (+50)
    if (provider.name && provider.name !== 'public') {
        score += 50;
    }

    // 3. Explicitly configured URL matching imageUrl gets priority (+20)
    if (
        typeof config.url === 'string' &&
        imageUrl &&
        config.url.toLowerCase().includes(imageUrl.toLowerCase())
    ) {
        score += 20;
    }

    // 4. Any custom configuration beyond empty string (+10)
    if (typeof config === 'object' && Object.keys(config).length > 0) {
        score += 10;
    }

    return score;
}

/**
 * Match image URL against available registries, prioritizing configured/authenticated instances.
 */
export function findRegistryProvider(
    imageUrl: string,
    registries: Record<string, Registry> = {},
): Registry | undefined {
    const matching = Object.values(registries).filter(
        (provider) =>
            provider &&
            typeof provider.match === 'function' &&
            provider.match(imageUrl),
    );
    if (matching.length === 0) {
        return undefined;
    }
    if (matching.length === 1) {
        return matching[0];
    }
    matching.sort(
        (a, b) =>
            getRegistryPriority(b, imageUrl) - getRegistryPriority(a, imageUrl),
    );
    return matching[0];
}

/**
 * Get Registry by name with alias fallback:
 * 1. Exact match in registries
 * 2. `${registryName}.public` fallback
 * 3. Single instance of that provider type fallback
 */
export function resolveRegistry(
    registryName: string,
    registries: Record<string, Registry> = {},
): Registry {
    let registryToReturn = registries[registryName];
    if (!registryToReturn) {
        if (registries[`${registryName}.public`]) {
            registryToReturn = registries[`${registryName}.public`];
        } else {
            const providerType = registryName.includes('.')
                ? registryName.split('.')[0]
                : registryName;
            const matchingRegistries = Object.entries(registries).filter(
                ([key, reg]: [string, any]) =>
                    key === providerType ||
                    key.startsWith(`${providerType}.`) ||
                    reg?.type === providerType ||
                    (reg?.getId &&
                        typeof reg.getId === 'function' &&
                        (reg.getId() === registryName ||
                            reg.getId() === providerType ||
                            reg.getId().startsWith(`${providerType}.`))),
            );
            if (matchingRegistries.length === 1) {
                registryToReturn = matchingRegistries[0][1];
            }
        }
    }
    if (!registryToReturn) {
        throw new Error(`Unsupported Registry ${registryName}`);
    }
    return registryToReturn;
}

/**
 * Check if a registry is supported / registered.
 */
export function isRegistryRegistered(
    registryName: string | undefined,
    registries: Record<string, Registry> = {},
): boolean {
    if (!registryName) {
        return false;
    }
    try {
        return resolveRegistry(registryName, registries) !== undefined;
    } catch {
        return false;
    }
}
