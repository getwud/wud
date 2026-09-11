import axios, { AxiosRequestConfig, Method, AxiosResponse } from 'axios';
import log from '../log';
import Component, { ComponentConfiguration } from '../registry/Component';
import { getSummaryTags } from '../prometheus/registry';
import { ContainerImage } from '../model/container';

const DEFAULT_CONCURRENCY = 2;
const MAX_RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_BACKOFF_BASE_MS = 2000;
const MAX_RETRY_AFTER_MS = 60000;

export interface RegistryManifest {
    digest?: string;
    version?: number;
    created?: string;
    /**
     * Digest of the image config blob, when the fetched manifest carried it.
     * Absent for a multi-arch index, whose child manifest was not fetched.
     */
    configDigest?: string;
}

export interface RegistryImageConfig {
    created?: string;
    version?: string;
}

/**
 * Image config blob (the object a manifest's `config.digest` points at).
 */
export interface RegistryConfigBlobResponse {
    created?: string;
    config?: {
        Labels?: Record<string, string>;
    };
}

export interface RegistryTagsList {
    name: string;
    tags: string[];
}

export interface RegistryManifestResponse {
    schemaVersion: number;
    mediaType?: string;
    manifests?: {
        digest: string;
        mediaType: string;
        platform: {
            architecture: string;
            os: string;
            variant?: string;
        };
    }[];
    config?: {
        digest: string;
        mediaType: string;
    };
    history?: {
        v1Compatibility: string;
    }[];
}

/**
 * Docker Registry Abstract class.
 */
export class Registry extends Component {
    private activeRequests = 0;
    private readonly pendingRequests: (() => void)[] = [];

    validateConfiguration(
        configuration: ComponentConfiguration,
    ): ComponentConfiguration {
        const isObjectConfiguration =
            configuration !== null &&
            typeof configuration === 'object' &&
            !Array.isArray(configuration);
        const { concurrency, ...providerConfiguration } = isObjectConfiguration
            ? configuration
            : { concurrency: undefined };

        const concurrencyValidated = this.joi
            .number()
            .integer()
            .min(1)
            .default(DEFAULT_CONCURRENCY)
            .validate(concurrency);
        if (concurrencyValidated.error) {
            throw concurrencyValidated.error;
        }

        const providerSchema = this.getConfigurationSchema();
        let providerConfigurationValidated = providerSchema.validate(
            isObjectConfiguration ? providerConfiguration : configuration,
        );
        if (
            providerConfigurationValidated.error &&
            isObjectConfiguration &&
            Object.hasOwn(configuration, 'concurrency') &&
            Object.keys(providerConfiguration).length === 0
        ) {
            const anonymousConfigurationValidated = providerSchema.validate('');
            if (!anonymousConfigurationValidated.error) {
                providerConfigurationValidated =
                    anonymousConfigurationValidated;
            }
        }
        if (providerConfigurationValidated.error) {
            throw providerConfigurationValidated.error;
        }

        return {
            ...(providerConfigurationValidated.value !== null &&
            typeof providerConfigurationValidated.value === 'object'
                ? providerConfigurationValidated.value
                : {}),
            concurrency: concurrencyValidated.value,
        };
    }

    /**
     * Encode Bse64(login:password)
     */
    static base64Encode(login: string, token: string) {
        return Buffer.from(`${login}:${token}`, 'utf-8').toString('base64');
    }

    /**
     * Check if the digest label value is to be watched for this registry (to be overridden).
     */
    shouldWatchDigest(
        _wudWatchDigestLabelValue: string,
        _image: string,
        watchDigestDefault?: boolean,
    ) {
        return watchDigestDefault !== undefined ? watchDigestDefault : true;
    }

    /**
     * If this registry is responsible for the image url (to be overridden).
     */
    match(_imageUrl: string): boolean {
        return false;
    }

    /**
     * Normalize image according to Registry Custom characteristics (to be overridden).
     */
    normalizeImage(image: ContainerImage): ContainerImage {
        return image;
    }

    /**
     * Authenticate and set authentication value to requestOptions.
     */
    async authenticate(
        _image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ): Promise<AxiosRequestConfig> {
        return requestOptions;
    }

    /**
     * Get Tags.
     */
    async getTags(image: ContainerImage): Promise<string[]> {
        this.log.debug(`Get ${image.name} tags`);
        const tags: string[] = [];
        let page: AxiosResponse<RegistryTagsList> | undefined = undefined;
        let hasNext = true;
        let link: string | undefined = undefined;
        while (hasNext) {
            const lastItem =
                page && page.data && page.data.tags
                    ? page.data.tags[page.data.tags.length - 1]
                    : undefined;

            page = await this.getTagsPage(image, lastItem, link);
            const pageTags =
                page && page.data && page.data.tags ? page.data.tags : [];
            link = page && page.headers ? page.headers.link : undefined;
            hasNext = page && page.headers && page.headers.link !== undefined;
            tags.push(...pageTags);
        }

        // Sort alpha then reverse to get higher values first
        tags.sort();
        tags.reverse();
        return tags;
    }

    /**
     * Get tags page
     */
    getTagsPage(
        image: ContainerImage,
        lastItem: string | undefined = undefined,
        _link: string | undefined = undefined,
    ) {
        // Default items per page (not honoured by all registries)
        const itemsPerPage = 1000;
        const last = lastItem ? `&last=${lastItem}` : '';
        return this.callRegistry<RegistryTagsList>({
            image,
            url: `${image.registry.url}/${image.name}/tags/list?n=${itemsPerPage}${last}`,
            resolveWithFullResponse: true,
        });
    }

    /**
     * Get image manifest for a remote tag.
     */
    async getImageManifestDigest(
        image: ContainerImage,
        digest?: string,
    ): Promise<RegistryManifest> {
        const tagOrDigest = digest || image.tag.value;
        let manifestDigestFound;
        let manifestMediaType;
        let configDigestFound;
        this.log.debug(
            `${this.getId()} - Get ${image.name}:${tagOrDigest} manifest`,
        );
        const responseManifests =
            await this.callRegistry<RegistryManifestResponse>({
                image,
                url: `${image.registry.url}/${image.name}/manifests/${tagOrDigest}`,
                headers: {
                    Accept: 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
                },
            });
        if (responseManifests) {
            log.debug(`Found manifests [${JSON.stringify(responseManifests)}]`);
            if (responseManifests.schemaVersion === 2) {
                log.debug('Manifests found with schemaVersion = 2');
                log.debug(
                    `Manifests media type detected [${responseManifests.mediaType}]`,
                );
                if (
                    responseManifests.mediaType ===
                        'application/vnd.docker.distribution.manifest.list.v2+json' ||
                    responseManifests.mediaType ===
                        'application/vnd.oci.image.index.v1+json'
                ) {
                    log.debug(
                        `Filter manifest for [arch=${image.architecture}, os=${image.os}, variant=${image.variant}]`,
                    );
                    let manifestFound;
                    const manifestFounds = responseManifests.manifests.filter(
                        (manifest: any) =>
                            manifest.platform.architecture ===
                                image.architecture &&
                            manifest.platform.os === image.os,
                    );

                    // 1 manifest matching al least? Get the first one (better than nothing)
                    if (manifestFounds.length > 0) {
                        [manifestFound] = manifestFounds;
                    }

                    // Multiple matching manifests? Try to refine using variant filtering
                    if (manifestFounds.length > 1) {
                        const manifestFoundFilteredOnVariant =
                            manifestFounds.find(
                                (manifest: any) =>
                                    manifest.platform.variant === image.variant,
                            );

                        // Manifest exactly matching with variant? Select it
                        if (manifestFoundFilteredOnVariant) {
                            manifestFound = manifestFoundFilteredOnVariant;
                        }
                    }

                    if (manifestFound) {
                        log.debug(
                            `Manifest found with [digest=${manifestFound.digest}, mediaType=${manifestFound.mediaType}]`,
                        );
                        manifestDigestFound = manifestFound.digest;
                        manifestMediaType = manifestFound.mediaType;
                    }
                } else if (
                    responseManifests.mediaType ===
                        'application/vnd.docker.distribution.manifest.v2+json' ||
                    responseManifests.mediaType ===
                        'application/vnd.oci.image.manifest.v1+json'
                ) {
                    // Single-platform manifest (no list/index) => the reference
                    // we already fetched it by (tag or digest) *is* the manifest
                    // identifier. Do not use responseManifests.config.digest here;
                    // that's the digest of the config blob, not of the manifest,
                    // and is not a valid value to re-request a manifest with.
                    log.debug(
                        `Manifest found with [reference=${tagOrDigest}, mediaType=${responseManifests.mediaType}]`,
                    );
                    manifestDigestFound = tagOrDigest;
                    manifestMediaType = responseManifests.mediaType;
                    // This response IS the platform manifest, so its config
                    // digest is already known; remember it so callers wanting
                    // the config blob need not re-fetch the manifest.
                    configDigestFound = responseManifests.config?.digest;
                }
            } else if (responseManifests.schemaVersion === 1) {
                log.debug('Manifests found with schemaVersion = 1');
                const v1Compat = JSON.parse(
                    responseManifests.history[0].v1Compatibility,
                );
                const manifestFound = {
                    digest: v1Compat.config ? v1Compat.config.Image : undefined,
                    created: v1Compat.created,
                    version: 1,
                };
                log.debug(
                    `Manifest found with [digest=${manifestFound.digest}, created=${manifestFound.created}, version=${manifestFound.version}]`,
                );
                return manifestFound;
            }
            if (
                (manifestDigestFound &&
                    manifestMediaType ===
                        'application/vnd.docker.distribution.manifest.v2+json') ||
                (manifestDigestFound &&
                    manifestMediaType ===
                        'application/vnd.oci.image.manifest.v1+json')
            ) {
                log.debug(
                    'Calling registry to get docker-content-digest header',
                );
                const responseManifest =
                    await this.callRegistry<RegistryManifestResponse>({
                        image,
                        method: 'head',
                        url: `${image.registry.url}/${image.name}/manifests/${manifestDigestFound}`,
                        headers: {
                            Accept: manifestMediaType,
                        },
                        resolveWithFullResponse: true,
                    });
                const manifestFound = {
                    digest: responseManifest.headers['docker-content-digest'],
                    version: 2,
                    // Only present when the fetched manifest carried it, i.e.
                    // not for a multi-arch index.
                    ...(configDigestFound
                        ? { configDigest: configDigestFound }
                        : {}),
                };
                log.debug(
                    `Manifest found with [digest=${manifestFound.digest}, version=${manifestFound.version}]`,
                );
                return manifestFound;
            }
            if (
                (manifestDigestFound &&
                    manifestMediaType ===
                        'application/vnd.docker.container.image.v1+json') ||
                (manifestDigestFound &&
                    manifestMediaType ===
                        'application/vnd.oci.image.config.v1+json')
            ) {
                const manifestFound = {
                    digest: manifestDigestFound,
                    version: 1,
                };
                log.debug(
                    `Manifest found with [digest=${manifestFound.digest}, version=${manifestFound.version}]`,
                );
                return manifestFound;
            }
        }
        // Empty result...
        throw new Error('Unexpected error; no manifest found');
    }

    /**
     * Get the version label and build date of a remote image.
     *
     * A digest-only update ("sha A -> sha B") says nothing about what changed.
     * Both the `org.opencontainers.image.version` label and the build date live
     * in the image config blob, which the manifest points at.
     *
     * Pass `knownConfigDigest` when the manifest has already been fetched (see
     * `RegistryManifest.configDigest`) to resolve the config in a single request
     * instead of two.
     */
    async getImageConfig(
        image: ContainerImage,
        manifestDigest: string,
        knownConfigDigest?: string,
    ): Promise<RegistryImageConfig> {
        this.log.debug(
            `${this.getId()} - Get ${image.name}@${manifestDigest} image config`,
        );

        let configDigest = knownConfigDigest;
        if (!configDigest) {
            // Addressing a manifest by its own digest never yields an index,
            // so only the single-platform manifest types are accepted here.
            const manifest = await this.callRegistry<RegistryManifestResponse>({
                image,
                url: `${image.registry.url}/${image.name}/manifests/${manifestDigest}`,
                headers: {
                    Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
                },
            });
            configDigest = manifest?.config?.digest;
        }

        if (!configDigest) {
            throw new Error(
                `No config digest found in manifest ${manifestDigest}`,
            );
        }

        const configBlob = await this.callRegistry<RegistryConfigBlobResponse>({
            image,
            url: `${image.registry.url}/${image.name}/blobs/${configDigest}`,
        });

        const imageConfig: RegistryImageConfig = {
            created: configBlob?.created || undefined,
            // Images built with `ARG VERSION` + `LABEL ...version=$VERSION` and no
            // build arg publish an EMPTY label. Keep it undefined rather than '',
            // which the container schema rejects.
            version:
                configBlob?.config?.Labels?.[
                    'org.opencontainers.image.version'
                ] || undefined,
        };
        this.log.debug(
            `Image config found with [created=${imageConfig.created}, version=${imageConfig.version}]`,
        );
        return imageConfig;
    }

    async callRegistry<T = any>(options: {
        image: ContainerImage;
        url: string;
        method?: Method;
        headers?: any;
        resolveWithFullResponse: true;
    }): Promise<AxiosResponse<T>>;

    async callRegistry<T = any>(options: {
        image: ContainerImage;
        url: string;
        method?: Method;
        headers?: any;
        resolveWithFullResponse?: false;
    }): Promise<T>;

    async callRegistry<T = any>({
        image,
        url,
        method = 'get',
        headers = {
            Accept: 'application/json',
        },
        resolveWithFullResponse = false,
    }: {
        image: ContainerImage;
        url: string;
        method?: Method;
        headers?: any;
        resolveWithFullResponse?: boolean;
    }): Promise<T | AxiosResponse<T>> {
        // Request options
        const axiosOptions: AxiosRequestConfig = {
            url,
            method,
            headers,
            responseType: 'json',
        };
        let axiosOptionsWithAuth: AxiosRequestConfig | undefined;

        for (let retry = 0; ; retry += 1) {
            try {
                const response = await this.withRequestPermit(async () => {
                    const start = new Date().getTime();
                    try {
                        axiosOptionsWithAuth =
                            axiosOptionsWithAuth ||
                            (await this.authenticate(image, axiosOptions));
                        return (await axios(
                            axiosOptionsWithAuth,
                        )) as AxiosResponse<T>;
                    } finally {
                        this.observePrometheusSummaryTags(start);
                    }
                });
                return resolveWithFullResponse ? response : response.data;
            } catch (error: any) {
                if (
                    error?.response?.status !== 429 ||
                    retry >= MAX_RATE_LIMIT_RETRIES
                ) {
                    throw error;
                }

                const retryAfter = this.getRetryAfterMs(error);
                if (
                    retryAfter !== undefined &&
                    retryAfter > MAX_RETRY_AFTER_MS
                ) {
                    this.log.warn(
                        `Registry rate limited; Retry-After exceeds ${MAX_RETRY_AFTER_MS}ms, deferring until the next check`,
                    );
                    throw error;
                }

                const delay = retryAfter ?? this.getRateLimitBackoffMs(retry);
                this.log.warn(
                    `Registry rate limited; retry ${retry + 1}/${MAX_RATE_LIMIT_RETRIES} in ${delay}ms`,
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    private async withRequestPermit<T>(request: () => Promise<T>): Promise<T> {
        if (
            this.activeRequests >=
            (this.configuration.concurrency ?? DEFAULT_CONCURRENCY)
        ) {
            await new Promise<void>((resolve) =>
                this.pendingRequests.push(resolve),
            );
        } else {
            this.activeRequests += 1;
        }

        try {
            return await request();
        } finally {
            const next = this.pendingRequests.shift();
            if (next) {
                next();
            } else {
                this.activeRequests -= 1;
            }
        }
    }

    private getRetryAfterMs(error: any): number | undefined {
        const headers = error?.response?.headers;
        const retryAfter =
            typeof headers?.get === 'function'
                ? headers.get('retry-after')
                : headers?.['retry-after'];

        if (retryAfter === undefined || retryAfter === null) {
            return undefined;
        }

        const retryAfterString = String(retryAfter).trim();
        if (/^\d+$/.test(retryAfterString)) {
            return Number(retryAfterString) * 1000;
        }

        const retryAt = Date.parse(retryAfterString);
        if (Number.isNaN(retryAt) || retryAt <= Date.now()) {
            return undefined;
        }
        return retryAt - Date.now();
    }

    private getRateLimitBackoffMs(retry: number) {
        const exponentialDelay = RATE_LIMIT_BACKOFF_BASE_MS * 2 ** retry;
        return Math.round(
            exponentialDelay / 2 + (Math.random() * exponentialDelay) / 2,
        );
    }

    observePrometheusSummaryTags(start: number) {
        const summaryTags = getSummaryTags();
        if (summaryTags) {
            const end = new Date().getTime();
            summaryTags.observe(
                { type: this.type, name: this.name },
                (end - start) / 1000,
            );
        }
    }

    getImageFullName(image: ContainerImage, tagOrDigest: string) {
        // digests are separated with @ whereas tags are separated with :
        const tagOrDigestWithSeparator =
            tagOrDigest.indexOf(':') !== -1
                ? `@${tagOrDigest}`
                : `:${tagOrDigest}`;
        let fullName = `${image.registry.url}/${image.name}${tagOrDigestWithSeparator}`;

        fullName = fullName.replace(/https?:\/\//, '');
        fullName = fullName.replace(/\/v2/, '');
        return fullName;
    }

    /**
     * Return {username, pass } or undefined.
     */
    async getAuthPull(): Promise<
        { username?: string; password?: string } | undefined
    > {
        return undefined;
    }
}

export default Registry;
