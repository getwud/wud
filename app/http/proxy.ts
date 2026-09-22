import axios, { AxiosInstance, AxiosRequestConfig, AxiosStatic } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';

export type ProxyAgent = HttpsProxyAgent<string> | SocksProxyAgent;

export interface AxiosProxyConfig {
    httpsAgent?: ProxyAgent;
    httpAgent?: ProxyAgent;
    proxy: false;
}

const proxyAgentCache = new Map<string, ProxyAgent>();

/**
 * Clear the cached proxy agent instances (primarily for testing).
 */
export function clearProxyAgentCache(): void {
    proxyAgentCache.clear();
}

/**
 * Create a proxy agent for a given proxy URL.
 */
export function createProxyAgent(proxyUrl: string): ProxyAgent {
    const { protocol } = new URL(proxyUrl);
    if (protocol.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
    }
    if (protocol === 'http:' || protocol === 'https:') {
        return new HttpsProxyAgent(proxyUrl);
    }
    throw new Error(`Unsupported proxy protocol (${protocol}) for proxy url`);
}

/**
 * Get or create a cached proxy agent for a proxy URL.
 */
export function getCachedProxyAgent(proxyUrl: string): ProxyAgent {
    let agent = proxyAgentCache.get(proxyUrl);
    if (!agent) {
        agent = createProxyAgent(proxyUrl);
        proxyAgentCache.set(proxyUrl, agent);
    }
    return agent;
}

/**
 * Mask proxy credentials (password) for safe logging / display.
 */
export function maskProxy(proxyUrl?: string): string | undefined {
    if (!proxyUrl) {
        return undefined;
    }
    try {
        const url = new URL(proxyUrl);
        if (url.password) {
            url.password = '***';
        }
        return url.toString();
    } catch {
        return '***';
    }
}

/**
 * Resolve proxy configuration for Axios based on target URL and/or explicit proxy URL.
 * Automatically checks HTTP_PROXY, HTTPS_PROXY, NO_PROXY env vars when no explicit proxy is given.
 */
export function getAxiosProxyConfig(
    targetUrl?: string,
    explicitProxyUrl?: string,
): AxiosProxyConfig | undefined {
    const resolvedProxyUrl =
        explicitProxyUrl || (targetUrl ? getProxyForUrl(targetUrl) : undefined);

    if (!resolvedProxyUrl) {
        return undefined;
    }

    const agent = getCachedProxyAgent(resolvedProxyUrl);
    const parsedProxy = new URL(resolvedProxyUrl);

    if (parsedProxy.protocol.startsWith('socks')) {
        return {
            httpAgent: agent,
            httpsAgent: agent,
            proxy: false,
        };
    }

    let isHttps = true;
    if (targetUrl) {
        try {
            const parsedTarget = new URL(targetUrl);
            isHttps = parsedTarget.protocol === 'https:';
        } catch {
            isHttps = !targetUrl.startsWith('http://');
        }
    }

    if (isHttps) {
        return {
            httpsAgent: agent,
            proxy: false,
        };
    }

    return undefined;
}

/**
 * Apply proxy configuration (httpsAgent/httpAgent with proxy: false) to an Axios request config.
 */
export function applyProxyConfig<T extends AxiosRequestConfig>(
    config: T,
    explicitProxyUrl?: string,
): T {
    if (config.httpsAgent) {
        return config;
    }
    if (config.proxy === false && !explicitProxyUrl) {
        return config;
    }
    if (
        typeof config.proxy === 'object' &&
        config.proxy !== null &&
        !explicitProxyUrl
    ) {
        return config;
    }

    const targetUrl =
        config.url && config.url.startsWith('http')
            ? config.url
            : config.baseURL || config.url;

    const proxyConfig = getAxiosProxyConfig(targetUrl, explicitProxyUrl);
    if (proxyConfig) {
        Object.assign(config, proxyConfig);
    }
    return config;
}

const PROXY_INTERCEPTOR_ATTACHED = Symbol.for('wud.proxy.interceptor.attached');

/**
 * Attach proxy interceptor to an Axios instance.
 */
export function setupAxiosProxy(
    axiosInstance: AxiosStatic | AxiosInstance = axios,
): void {
    if (!axiosInstance?.interceptors?.request) {
        return;
    }
    const instanceRecord = axiosInstance as unknown as Record<symbol, boolean>;
    if (instanceRecord[PROXY_INTERCEPTOR_ATTACHED]) {
        return;
    }
    instanceRecord[PROXY_INTERCEPTOR_ATTACHED] = true;

    axiosInstance.interceptors.request.use((config) => {
        return applyProxyConfig(config);
    });
}

// Auto-register on the global Axios instance when interceptors are present
if (axios?.interceptors?.request) {
    setupAxiosProxy(axios);
}
