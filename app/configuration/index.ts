// @ts-nocheck
import fs from 'fs';
import joi from 'joi';
import setValue from 'set-value';
import { Request } from 'express';

const VAR_FILE_SUFFIX = '__FILE';

/*
 * Get a prop by path from environment variables.
 * @param prop
 * @returns {{}}
 */
export function get(prop, env = process.env) {
    const object = {};
    const envVarPattern = prop.replace(/\./g, '_').toUpperCase();
    const matchingEnvVars = Object.keys(env).filter((envKey) =>
        envKey.startsWith(envVarPattern),
    );
    matchingEnvVars.forEach((matchingEnvVar) => {
        const envVarValue = env[matchingEnvVar];
        const matchingPropPath = matchingEnvVar
            .replace(/_/g, '.')
            .toLowerCase();
        const matchingPropPathWithoutPrefix = matchingPropPath.replace(
            `${prop}.`,
            '',
        );
        setValue(object, matchingPropPathWithoutPrefix, envVarValue);
    });
    return object;
}

/**
 * Lookup external secrets defined in files.
 * @param wudEnvVars
 */
export function replaceSecrets(wudEnvVars) {
    const secretFileEnvVars = Object.keys(wudEnvVars).filter((wudEnvVar) =>
        wudEnvVar.toUpperCase().endsWith(VAR_FILE_SUFFIX),
    );
    secretFileEnvVars.forEach((secretFileEnvVar) => {
        const secretKey = secretFileEnvVar.replace(VAR_FILE_SUFFIX, '');
        const secretFilePath = wudEnvVars[secretFileEnvVar];
        const secretFileValue = fs.readFileSync(secretFilePath, 'utf-8').trim();
        delete wudEnvVars[secretFileEnvVar];
        wudEnvVars[secretKey] = secretFileValue;
    });
}

// 1. Get a copy of all wud related env vars
export const wudEnvVars = {};
Object.keys(process.env)
    .filter(
        (envVar) =>
            envVar.toUpperCase().startsWith('WUD') ||
            envVar.toUpperCase().startsWith('_WUD'),
    )
    .forEach((wudEnvVar) => {
        wudEnvVars[wudEnvVar] = process.env[wudEnvVar];
    });

// 2. Replace all secret files referenced by their secret values
replaceSecrets(wudEnvVars);

export function getVersion() {
    if (wudEnvVars.WUD_VERSION) {
        return wudEnvVars.WUD_VERSION;
    }
    try {
        const pkg = require('../package.json');
        return pkg.version || 'unknown';
    } catch {
        try {
            const pkg = require('../../package.json');
            return pkg.version || 'unknown';
        } catch {
            return 'unknown';
        }
    }
}

export function getLogLevel() {
    return wudEnvVars.WUD_LOG_LEVEL || 'info';
}
/**
 * Get watcher configuration.
 */
export function getWatcherConfigurations() {
    return get('wud.watcher', wudEnvVars);
}

/**
 * Get trigger configurations.
 */
export function getTriggerConfigurations() {
    return get('wud.trigger', wudEnvVars);
}

/**
 * Get registry configurations.
 * @returns {*}
 */
export function getRegistryConfigurations() {
    return get('wud.registry', wudEnvVars);
}

/**
 * Get authentication configurations.
 * @returns {*}
 */
export function getAuthenticationConfigurations() {
    const authConfigs = get('wud.auth', wudEnvVars) as any;
    if (authConfigs && typeof authConfigs === 'object') {
        const { admin, ...providers } = authConfigs;
        return providers;
    }
    return authConfigs;
}

/**
 * Get Input configurations.
 */
export function getStoreConfiguration() {
    return get('wud.store', wudEnvVars);
}

/**
 * Get Server configurations.
 */
export function getServerConfiguration() {
    const configurationFromEnv = get('wud.server', wudEnvVars);
    const configurationSchema = joi.object().keys({
        enabled: joi.boolean().default(true),
        port: joi.number().default(3000).integer().min(0).max(65535),
        tls: joi
            .object({
                enabled: joi.boolean().default(false),
                key: joi.string().when('enabled', {
                    is: true,
                    then: joi.required(),
                    otherwise: joi.optional(),
                }),
                cert: joi.string().when('enabled', {
                    is: true,
                    then: joi.required(),
                    otherwise: joi.optional(),
                }),
            })
            .default({}),
        cors: joi
            .object({
                enabled: joi.boolean().default(false),
                origin: joi.string().default('*'),
                methods: joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
            })
            .default({}),
        basepath: joi.string().default('/'),
        feature: joi
            .object({
                delete: joi.boolean().default(true),
            })
            .default({
                delete: true,
            }),
    });

    // Validate Configuration
    const configurationToValidate = configurationSchema.validate(
        configurationFromEnv || {},
    );
    if (configurationToValidate.error) {
        throw configurationToValidate.error;
    }
    return configurationToValidate.value;
}

/**
 * Get Prometheus configurations.
 */
export function getPrometheusConfiguration() {
    const configurationFromEnv = get('wud.prometheus', wudEnvVars);
    const configurationSchema = joi.object().keys({
        enabled: joi.boolean().default(true),
        auth: joi.boolean().default(true),
    });

    // Validate Configuration
    const configurationToValidate = configurationSchema.validate(
        configurationFromEnv || {},
    );
    if (configurationToValidate.error) {
        throw configurationToValidate.error;
    }
    return configurationToValidate.value;
}

export function getPublicUrl(req: Request) {
    const publicUrl = wudEnvVars.WUD_PUBLIC_URL;
    // Try to guess from request if not explicitly configured
    const origin =
        publicUrl ?? `${req.protocol}://${req.headers.host ?? req.hostname}`;
    const basepath = getServerConfiguration().basepath;
    if (basepath === '/') {
        return origin.replace(/\/$/, '');
    }
    return `${origin.replace(/\/$/, '')}${basepath}`;
}

export interface HubConfiguration {
    enabled: boolean;
    key?: string;
    endpoint: string;
    concurrency: number;
    timeout: number;
}

/**
 * Get WUD Hub configuration.
 */
export function getHubConfiguration(): HubConfiguration {
    const rawKey =
        wudEnvVars.WUD_HUB_API_KEY ||
        wudEnvVars.WUD_HUB_KEY ||
        (get('wud.hub', wudEnvVars) as any)?.api?.key ||
        (get('wud.hub', wudEnvVars) as any)?.key;

    const rawEndpoint =
        wudEnvVars.WUD_HUB_ENDPOINT ||
        wudEnvVars._WUD_HUB_URL ||
        process.env._WUD_HUB_URL ||
        (get('wud.hub', wudEnvVars) as any)?.endpoint ||
        'https://hub.getwud.com';

    const rawConcurrency =
        wudEnvVars.WUD_HUB_CONCURRENCY ||
        (get('wud.hub', wudEnvVars) as any)?.concurrency ||
        5;

    const rawTimeout =
        wudEnvVars.WUD_HUB_TIMEOUT ||
        (get('wud.hub', wudEnvVars) as any)?.timeout ||
        30000;

    const schema = joi.object({
        enabled: joi
            .boolean()
            .default(Boolean(rawKey && String(rawKey).trim() !== '')),
        key: joi.string().allow('', null).optional(),
        endpoint: joi
            .string()
            .uri({ scheme: ['http', 'https'] })
            .default('https://hub.getwud.com'),
        concurrency: joi.number().integer().min(1).max(20).default(5),
        timeout: joi.number().integer().min(1000).max(60000).default(30000),
    });

    const validation = schema.validate({
        key: rawKey ? String(rawKey).trim() : undefined,
        endpoint: rawEndpoint
            ? String(rawEndpoint).trim().replace(/\/+$/, '')
            : undefined,
        concurrency:
            rawConcurrency !== undefined ? Number(rawConcurrency) : undefined,
        timeout: rawTimeout !== undefined ? Number(rawTimeout) : undefined,
    });

    if (validation.error) {
        throw new Error(
            `Configuration WUD Hub invalide : ${validation.error.message}`,
        );
    }

    return validation.value;
}
