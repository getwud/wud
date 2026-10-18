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
} from './types';

const log = logger.child({ component: 'remote-metadata-provider' });

export class RemoteMetadataProvider {
    private readonly config: HubConfiguration;
    private readonly client: AxiosInstance;
    private readonly pool: ConcurrencyPool;
    private readonly containerMetadata = new Map<string, ContainerHubMetadata>();

    private status: ProviderConnectionStatus = 'standalone';
    private consecutiveErrors = 0;
    private backoffUntil = 0;
    private lastErrorMessage?: string;
    private lastCheckTimestamp?: string;

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

    getStatus(): HubStatusSummary {
        return {
            enabled: this.config.enabled,
            status: this.status,
            endpoint: this.config.endpoint,
            hasKey: Boolean(this.config.key && this.config.key.trim() !== ''),
            lastCheck: this.lastCheckTimestamp,
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
