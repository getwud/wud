import axios, { AxiosInstance } from 'axios';
import { getHubConfiguration, HubConfiguration } from '../configuration';
import logger from '../log';
import { ConcurrencyPool } from './concurrency';
import {
    RemoteSettingsRequest,
    RemoteSettingsResponse,
    ProviderConnectionStatus,
    HubStatusSummary,
    ContainerHubMetadata,
    RemoteHubDetails,
    RiskAnalysisResult,
} from './types';

const log = logger.child({ component: 'remote-metadata-provider' });

export class RemoteMetadataProvider {
    private readonly config: HubConfiguration;
    private readonly client: AxiosInstance;
    private readonly pool: ConcurrencyPool;
    private readonly containerMetadata = new Map<
        string,
        ContainerHubMetadata
    >();
    private readonly riskCache = new Map<string, RiskAnalysisResult>();

    private status: ProviderConnectionStatus = 'standalone';
    private consecutiveErrors = 0;
    private backoffUntil = 0;
    private lastErrorMessage?: string;
    private lastCheckTimestamp?: string;
    private remoteStatus?: RemoteHubDetails;
    private lastRemoteFetchTime = 0;

    constructor(customConfig?: Partial<HubConfiguration>) {
        this.config = { ...getHubConfiguration(), ...customConfig };
        this.pool = new ConcurrencyPool(this.config.concurrency);

        if (!this.config.enabled || !this.config.key) {
            this.status = 'standalone';
        } else {
            this.status = 'connected';
        }

        this.client = axios.create({
            baseURL: this.config.endpoint,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(this.config.key
                    ? { Authorization: `Bearer ${this.config.key}` }
                    : {}),
            },
        });
    }

    async resolveSettings(
        request: RemoteSettingsRequest,
    ): Promise<RemoteSettingsResponse | null> {
        if (
            !this.config.enabled ||
            !this.config.key ||
            this.status === 'error'
        ) {
            return null;
        }

        const target = `${request.image.trim().toLowerCase()}:${request.tag?.trim() || 'latest'}`;

        // Backoff active check
        if (Date.now() < this.backoffUntil) {
            log.debug(
                `[Hub] Request skipped during backoff window (${target})`,
            );
            return null;
        }

        return this.pool.run(async () => {
            try {
                this.lastCheckTimestamp = new Date().toISOString();
                const response = await this.client.post<RemoteSettingsResponse>(
                    '/api/v1/settings/resolve',
                    {
                        image: request.image,
                        tag: request.tag,
                        labels: request.labels,
                    },
                );

                if (response.status === 200 && response.data) {
                    this.status = 'connected';
                    this.consecutiveErrors = 0;
                    this.lastErrorMessage = undefined;
                    return response.data;
                }
                return null;
            } catch (err: unknown) {
                this.handleHttpError(err, target);
                return null;
            }
        });
    }

    /**
     * Compute composite cache key for risk analysis.
     */
    private getRiskCacheKey(
        imageRef: string,
        currentTag: string,
        targetTag: string,
    ): string {
        return `${imageRef.trim().toLowerCase()}:${currentTag.trim()}:${targetTag.trim()}`;
    }

    /**
     * Resolve risk analysis for a candidate container update.
     */
    async getRiskAnalysis(
        imageRef: string,
        currentTag: string,
        targetTag: string,
        forceRefreshOrOptions: boolean | { forceRefresh?: boolean } = false,
    ): Promise<RiskAnalysisResult | null> {
        if (
            !this.config.enabled ||
            !this.config.key ||
            this.status === 'error'
        ) {
            return null;
        }

        const forceRefresh =
            typeof forceRefreshOrOptions === 'boolean'
                ? forceRefreshOrOptions
                : Boolean(forceRefreshOrOptions?.forceRefresh);

        const cacheKey = this.getRiskCacheKey(imageRef, currentTag, targetTag);

        // Check local in-memory cache
        if (!forceRefresh && this.riskCache.has(cacheKey)) {
            const cachedResult = this.riskCache.get(cacheKey)!;
            return {
                ...cachedResult,
                cached: true,
            };
        }

        // Backoff active check (e.g. 429 cooldown)
        if (Date.now() < this.backoffUntil) {
            log.debug(
                `[Hub] Risk query skipped during backoff window (${cacheKey})`,
            );
            return null;
        }

        return this.pool.run(async () => {
            try {
                this.lastCheckTimestamp = new Date().toISOString();
                const response = await this.client.post<RiskAnalysisResult>(
                    '/api/v1/changelogs/risk-analysis',
                    {
                        imageRef,
                        currentTag,
                        targetTag,
                    },
                    {
                        timeout: 4000,
                    },
                );

                if (response.status === 200 && response.data) {
                    this.status = 'connected';
                    this.consecutiveErrors = 0;
                    this.lastErrorMessage = undefined;

                    const enrichedResult: RiskAnalysisResult = {
                        ...response.data,
                        evaluatedAt:
                            response.data.evaluatedAt ||
                            new Date().toISOString(),
                    };
                    this.riskCache.set(cacheKey, enrichedResult);
                    return enrichedResult;
                }
                return null;
            } catch (err: unknown) {
                this.handleHttpError(err, cacheKey);
                return null;
            }
        });
    }

    /**
     * Invalidate cached risk entry.
     */
    invalidateRiskCache(
        imageRef: string,
        currentTag: string,
        targetTag: string,
    ): void {
        const cacheKey = this.getRiskCacheKey(imageRef, currentTag, targetTag);
        this.riskCache.delete(cacheKey);
    }

    /**
     * Retrieve cached risk analysis synchronously if available.
     */
    getCachedRiskAnalysis(
        imageRef: string,
        currentTag: string,
        targetTag: string,
    ): RiskAnalysisResult | undefined {
        const cacheKey = this.getRiskCacheKey(imageRef, currentTag, targetTag);
        const cached = this.riskCache.get(cacheKey);
        if (cached) {
            return {
                ...cached,
                cached: true,
            };
        }
        return undefined;
    }

    /**
     * Clear all cached risk entries.
     */
    clearRiskCache(): void {
        this.riskCache.clear();
    }

    private handleHttpError(err: unknown, target: string): void {
        const error = err as {
            response?: {
                status?: number;
                data?: { message?: string };
            };
            message?: string;
        };

        const statusCode = error.response?.status;
        const errMsg =
            error.response?.data?.message ||
            error.message ||
            'Unknown network error';
        this.lastErrorMessage = `(${statusCode || 'NET'}) ${errMsg}`;

        if (statusCode === 401 || statusCode === 403) {
            this.status = 'error';
            this.remoteStatus = undefined;
            log.warn(
                `[RemoteMetadataProvider] WUD Hub API Key rejected (HTTP ${statusCode}). Hub enrichment disabled until restart.`,
            );
            return;
        }

        if (statusCode === 429 || statusCode === 402) {
            this.status = 'degraded';
            this.backoffUntil = Date.now() + 3600000; // 1h cooldown
            log.warn(
                `[RemoteMetadataProvider] Hub quota exceeded or payment required (HTTP ${statusCode}). Cooling down requests for 1 hour.`,
            );
            return;
        }

        // Network error 5xx or timeout
        this.consecutiveErrors++;
        if (this.consecutiveErrors >= 3) {
            this.status = 'degraded';
        }

        log.debug(
            `[RemoteMetadataProvider] Resolution failed for ${target}: ${errMsg} (preserving local mode)`,
        );
    }

    async fetchRemoteStatus(): Promise<RemoteHubDetails | null> {
        if (!this.config.enabled || !this.config.key) {
            return null;
        }

        return this.pool.run(async () => {
            try {
                this.lastCheckTimestamp = new Date().toISOString();
                const response =
                    await this.client.get<RemoteHubDetails>(
                        '/api/v1/hub/status',
                    );

                if (response.status === 200 && response.data) {
                    this.status = 'connected';
                    this.consecutiveErrors = 0;
                    this.lastErrorMessage = undefined;
                    this.remoteStatus = response.data;
                    this.lastRemoteFetchTime = Date.now();
                    return response.data;
                }
                return null;
            } catch (err: unknown) {
                this.handleHttpError(err, 'hub_status');
                return null;
            }
        });
    }

    async getOrFetchStatus(forceRefresh = false): Promise<HubStatusSummary> {
        if (!this.config.enabled || !this.config.key) {
            return this.getStatus();
        }

        const CACHE_TTL_MS = 60 * 1000;
        if (
            !forceRefresh &&
            this.remoteStatus &&
            Date.now() - this.lastRemoteFetchTime < CACHE_TTL_MS
        ) {
            return this.getStatus();
        }

        await this.fetchRemoteStatus();
        return this.getStatus();
    }

    getStatus(): HubStatusSummary {
        return {
            enabled: this.config.enabled,
            status: this.status,
            endpoint: this.config.endpoint,
            hasKey: Boolean(this.config.key && this.config.key.trim() !== ''),
            lastCheck: this.lastCheckTimestamp,
            remote: this.remoteStatus,
            errorMessage: this.lastErrorMessage,
        };
    }

    setContainerMetadata(
        containerId: string,
        metadata: ContainerHubMetadata,
    ): void {
        this.containerMetadata.set(containerId, metadata);
    }

    getContainerMetadata(
        containerId: string,
    ): ContainerHubMetadata | undefined {
        return this.containerMetadata.get(containerId);
    }

    deleteContainerMetadata(containerId: string): void {
        this.containerMetadata.delete(containerId);
    }
}

let providerInstance: RemoteMetadataProvider | null = null;

export function getRemoteMetadataProvider(
    customConfig?: Partial<HubConfiguration>,
): RemoteMetadataProvider {
    if (!providerInstance || customConfig) {
        providerInstance = new RemoteMetadataProvider(customConfig);
    }
    return providerInstance;
}

export function resetRemoteMetadataProvider(): void {
    providerInstance = null;
}
