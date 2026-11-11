import axios, { AxiosRequestConfig, Method, AxiosResponse } from 'axios';
import log from '../log';
import Component, { ComponentConfiguration } from '../registry/Component';
import { getSummaryTags } from '../prometheus/registry';
import { ContainerImage } from '../model/container';
import { getVersion } from '../configuration';
import { applyProxyConfig, maskProxy } from '../http/proxy';

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_PULL_CONCURRENCY = 1;
const MAX_RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_BACKOFF_BASE_MS = 2000;
const MAX_RETRY_AFTER_MS = 60000;

export interface RegistryPushHint {
    host: string;
    repository: string;
    tag: string;
    digest: string;
}

export interface RegistryManifest {
    digest?: string;
    indexDigest?: string;
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

export class UnsupportedArtifactError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsupportedArtifactError';
        Object.setPrototypeOf(this, UnsupportedArtifactError.prototype);
    }
}

export function isNonContainerArtifactError(error: unknown): boolean {
    return (
        error instanceof UnsupportedArtifactError ||
        (error instanceof Error && error.name === 'UnsupportedArtifactError')
    );
}

export interface RegistryManifestResponse {
    schemaVersion: number;
    mediaType?: string;
    artifactType?: string;
    manifests?: {
        digest: string;
        mediaType: string;
        artifactType?: string;
        platform?: {
            architecture: string;
            os: string;
            variant?: string;
        };
    }[];
    config?: {
        digest: string;
        mediaType: string;
    };
    layers?: {
        digest?: string;
        mediaType?: string;
        size?: number;
    }[];
    history?: {
        v1Compatibility: string;
    }[];
}

export function isNonContainerArtifact(
    manifest: RegistryManifestResponse,
): boolean {
    if (!manifest) {
        return false;
    }

    if (
        manifest.artifactType &&
        manifest.artifactType.startsWith('application/vnd.cncf.helm.')
    ) {
        return true;
    }

    if (manifest.config?.mediaType) {
        if (
            manifest.config.mediaType.startsWith('application/vnd.cncf.helm.')
        ) {
            return true;
        }
        const isContainerConfig =
            manifest.config.mediaType ===
                'application/vnd.docker.container.image.v1+json' ||
            manifest.config.mediaType ===
                'application/vnd.oci.image.config.v1+json';
        if (!isContainerConfig) {
            return true;
        }
    }

    if (manifest.layers && Array.isArray(manifest.layers)) {
        const hasHelmLayer = manifest.layers.some(
            (layer) =>
                layer.mediaType?.startsWith('application/vnd.cncf.helm.') ||
                layer.mediaType ===
                    'application/vnd.cncf.helm.chart.content.v1.tar+gzip',
        );
        if (hasHelmLayer) {
            return true;
        }
    }

    if (manifest.artifactType) {
        return true;
    }

    if (
        manifest.manifests &&
        Array.isArray(manifest.manifests) &&
        manifest.manifests.length > 0 &&
        manifest.manifests.every(
            (m) =>
                m.artifactType?.startsWith('application/vnd.cncf.helm.') ||
                m.mediaType?.startsWith('application/vnd.cncf.helm.'),
        )
    ) {
        return true;
    }

    return false;
}

export function getHeaderContentType(
    headers?: Record<string, any>,
): string | undefined {
    if (!headers || typeof headers !== 'object') {
        return undefined;
    }
    const contentTypeKey = Object.keys(headers).find(
        (key) => key.toLowerCase() === 'content-type',
    );
    if (!contentTypeKey) {
        return undefined;
    }
    const rawValue = headers[contentTypeKey];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (typeof value === 'string') {
        return value.split(';')[0].trim().toLowerCase();
    }
    return undefined;
}

export interface CandidateTagResolution {
    tag?: string;
    remoteDigest?: RegistryManifest;
}

export async function resolveCandidateTag(
    registryProvider: Registry,
    image: ContainerImage,
    tagsCandidates: string[],
    logContainer?: {
        info: (msg: string) => void;
        warn?: (msg: string) => void;
        debug?: (msg: string) => void;
    },
): Promise<CandidateTagResolution> {
    for (const candidateTag of tagsCandidates) {
        if (typeof registryProvider.getImageManifestDigest !== 'function') {
            return { tag: candidateTag };
        }
        const candidateImage: ContainerImage = {
            ...image,
            tag: {
                ...image.tag,
                value: candidateTag,
            },
        };
        try {
            const remoteDigest =
                await registryProvider.getImageManifestDigest(candidateImage);
            return { tag: candidateTag, remoteDigest };
        } catch (e: any) {
            if (isNonContainerArtifactError(e)) {
                if (logContainer && typeof logContainer.info === 'function') {
                    logContainer.info(
                        `Candidate tag ${candidateTag} is a non-container OCI artifact, skipping`,
                    );
                }
                continue;
            }
            throw e;
        }
    }
    return {};
}

export function getUserAgent(): string {
    return `wud/${getVersion()}`;
}

export interface RegistryTagCacheEntry {
    tags: string[];
    timestamp: number;
    lastTag?: string;
}

/**
 * Parse RFC 5988 Link header looking for `rel="next"`.
 * Example: `</v2/immich-app/immich-machine-learning/tags/list?last=v1.39.0&n=1000>; rel="next"`
 */
export function parseNextLink(
    linkHeader?: string | string[],
): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const headerStr = Array.isArray(linkHeader)
        ? linkHeader.join(',')
        : typeof linkHeader === 'string'
          ? linkHeader
          : undefined;
    if (!headerStr) {
        return undefined;
    }
    const linkRegex = /<([^>]+)>(?:\s*;[^,]*)*/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(headerStr)) !== null) {
        const fullEntry = match[0];
        const url = match[1].trim();
        if (/;\s*rel=["']?next["']?(?:[;\s]|$)/i.test(fullEntry)) {
            return url;
        }
    }
    return undefined;
}

/**
 * Resolve the next page URL handling full URLs, absolute paths, or query strings.
 */
export function resolveNextPageUrl(
    registryBaseUrl: string,
    imageName: string,
    nextLink: string,
): string {
    const extracted = parseNextLink(nextLink) || nextLink.trim();
    let link = extracted;
    if (link.startsWith('<')) {
        const match = link.match(/<([^>]+)>/);
        if (match) {
            link = match[1].trim();
        }
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
        return link;
    }
    if (link.startsWith('/')) {
        const origin = new URL(registryBaseUrl).origin;
        return `${origin}${link}`;
    }
    if (link.startsWith('?')) {
        return `${registryBaseUrl}/${imageName}/tags/list${link}`;
    }
    return `${registryBaseUrl}/${imageName}/tags/list/${link}`;
}

/**
 * Docker Registry Abstract class.
 */
export class Registry extends Component {
    static getUserAgent(): string {
        return getUserAgent();
    }

    private activeRequests = 0;
    private readonly pendingRequests: (() => void)[] = [];

    private activePulls = 0;
    private readonly pendingPulls: (() => void)[] = [];
    private pullsDeferredUntil = 0;

    protected readonly tagCache: Map<string, RegistryTagCacheEntry> = new Map();

    clearTagCache(): void {
        this.tagCache.clear();
    }

    protected getTagCacheKey(image: ContainerImage): string {
        const registryUrl = image.registry?.url || '';
        return `${registryUrl}/${image.name}`;
    }

    protected getCachedTags(image: ContainerImage): string[] | undefined {
        const ttlMs = (this.configuration.tagcachettl ?? 300) * 1000;
        if (ttlMs <= 0) {
            return undefined;
        }
        const key = this.getTagCacheKey(image);
        const cached = this.tagCache.get(key);
        if (cached && Date.now() - cached.timestamp < ttlMs) {
            return [...cached.tags];
        }
        return undefined;
    }

    protected setCachedTags(
        image: ContainerImage,
        tags: string[],
        lastTag?: string,
    ): void {
        const ttlMs = (this.configuration.tagcachettl ?? 300) * 1000;
        if (ttlMs <= 0) {
            return;
        }
        const key = this.getTagCacheKey(image);
        this.tagCache.set(key, {
            tags: [...tags],
            timestamp: Date.now(),
            lastTag,
        });
    }

    async hasTag(image: ContainerImage, tag: string): Promise<boolean> {
        try {
            await this.callRegistry({
                image,
                method: 'head',
                url: `${image.registry.url}/${image.name}/manifests/${tag}`,
                headers: {
                    Accept: 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
                },
                resolveWithFullResponse: true,
            });
            return true;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return false;
            }
            throw error;
        }
    }

    validateConfiguration(
        configuration: ComponentConfiguration,
    ): ComponentConfiguration {
        const isObjectConfiguration =
            configuration !== null &&
            typeof configuration === 'object' &&
            !Array.isArray(configuration);
        const {
            concurrency,
            pullconcurrency,
            proxy,
            webhook,
            maxpages,
            pagethrottle,
            tagcachettl,
            ...providerConfiguration
        } = isObjectConfiguration
            ? configuration
            : {
                  concurrency: undefined,
                  pullconcurrency: undefined,
                  proxy: undefined,
                  webhook: undefined,
                  maxpages: undefined,
                  pagethrottle: undefined,
                  tagcachettl: undefined,
              };

        const concurrencyValidated = this.joi
            .number()
            .integer()
            .min(1)
            .default(DEFAULT_CONCURRENCY)
            .validate(concurrency);
        if (concurrencyValidated.error) {
            throw concurrencyValidated.error;
        }

        const pullConcurrencyValidated = this.joi
            .number()
            .integer()
            .min(1)
            .optional()
            .validate(pullconcurrency);
        if (pullConcurrencyValidated.error) {
            throw pullConcurrencyValidated.error;
        }

        const proxyValidated = this.joi
            .string()
            .uri()
            .optional()
            .validate(proxy);
        if (proxyValidated.error) {
            throw proxyValidated.error;
        }

        const webhookValidated = this.joi
            .object({ token: this.joi.string().min(1).required() })
            .unknown(false)
            .optional()
            .validate(webhook);
        if (webhookValidated.error) throw webhookValidated.error;

        const maxPagesValidated = this.joi
            .number()
            .integer()
            .min(1)
            .optional()
            .validate(maxpages);
        if (maxPagesValidated.error) throw maxPagesValidated.error;

        const pageThrottleValidated = this.joi
            .number()
            .integer()
            .min(0)
            .default(0)
            .optional()
            .validate(pagethrottle);
        if (pageThrottleValidated.error) throw pageThrottleValidated.error;

        const tagCacheTtlValidated = this.joi
            .number()
            .integer()
            .min(0)
            .default(300)
            .optional()
            .validate(tagcachettl);
        if (tagCacheTtlValidated.error) throw tagCacheTtlValidated.error;

        const providerSchema = this.getConfigurationSchema();
        let providerConfigurationValidated = providerSchema.validate(
            isObjectConfiguration ? providerConfiguration : configuration,
        );
        if (
            providerConfigurationValidated.error &&
            isObjectConfiguration &&
            (Object.hasOwn(configuration, 'concurrency') ||
                Object.hasOwn(configuration, 'pullconcurrency') ||
                Object.hasOwn(configuration, 'proxy') ||
                Object.hasOwn(configuration, 'webhook') ||
                Object.hasOwn(configuration, 'maxpages') ||
                Object.hasOwn(configuration, 'pagethrottle') ||
                Object.hasOwn(configuration, 'tagcachettl')) &&
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
            ...(pullConcurrencyValidated.value !== undefined
                ? { pullconcurrency: pullConcurrencyValidated.value }
                : {}),
            ...(webhookValidated.value !== undefined
                ? { webhook: webhookValidated.value }
                : {}),
            ...(proxyValidated.value !== undefined
                ? { proxy: proxyValidated.value }
                : {}),
            ...(maxPagesValidated.value !== undefined
                ? { maxpages: maxPagesValidated.value }
                : {}),
            ...(pagethrottle !== undefined
                ? { pagethrottle: pageThrottleValidated.value }
                : {}),
            ...(tagcachettl !== undefined
                ? { tagcachettl: tagCacheTtlValidated.value }
                : {}),
        };
    }

    parseWebhook(body: unknown): RegistryPushHint[] {
        void body;
        throw new Error('Registry webhook format is unsupported');
    }

    maskConfiguration(
        configuration?: ComponentConfiguration,
    ): ComponentConfiguration {
        const masked = { ...(configuration || this.configuration) };
        if (masked.webhook?.token)
            masked.webhook = {
                ...masked.webhook,
                token: Registry.mask(masked.webhook.token),
            };
        if (masked.proxy) {
            masked.proxy = maskProxy(masked.proxy);
        }
        return masked;
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
        wudWatchDigestLabelValue?: string,
        _image?: string,
        watchDigestDefault?: boolean,
    ): boolean {
        if (
            wudWatchDigestLabelValue !== undefined &&
            wudWatchDigestLabelValue !== ''
        ) {
            return wudWatchDigestLabelValue.toLowerCase() === 'true';
        }
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
        const cachedTags = this.getCachedTags(image);
        if (cachedTags) {
            this.log.debug(
                `Tag cache hit for ${image.name} (${cachedTags.length} tags)`,
            );
            return cachedTags;
        }

        const tags = await this.paginateTags(image);
        this.setCachedTags(image, tags);
        return tags;
    }

    /**
     * Paginate tags from registry.
     */
    protected async paginateTags(
        image: ContainerImage,
        firstPage?: AxiosResponse<RegistryTagsList>,
        startingCursor?: string,
    ): Promise<string[]> {
        const tags: string[] = [];
        let page = firstPage;
        let pageCount = page ? 1 : 0;
        let hasNext = true;
        let link: string | undefined = undefined;
        const maxPages = this.configuration.maxpages as number | undefined;
        const pageThrottleMs = (this.configuration.pagethrottle ?? 0) as number;

        if (page) {
            const pageTags = page.data && page.data.tags ? page.data.tags : [];
            tags.push(...pageTags);
            const rawLinkHeader = page.headers ? page.headers.link : undefined;
            const nextLink = parseNextLink(rawLinkHeader);
            hasNext = nextLink !== undefined;
            link = rawLinkHeader;
        }

        while (hasNext) {
            if (maxPages !== undefined && pageCount >= maxPages) {
                this.log.debug(
                    `Reached max pages limit (${maxPages}) for ${image.name}`,
                );
                break;
            }

            if (pageCount > 0 && pageThrottleMs > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, pageThrottleMs),
                );
            }

            const lastItem =
                tags.length > 0 ? tags[tags.length - 1] : startingCursor;

            try {
                page = await this.getTagsPage(image, lastItem, link);
            } catch (error: any) {
                if (error?.response?.status === 429 && tags.length > 0) {
                    this.log.warn(
                        `Rate limit reached for ${image.name} after ${pageCount} pages; returning ${tags.length} partial tags`,
                    );
                    break;
                }
                throw error;
            }

            pageCount += 1;
            const pageTags =
                page && page.data && page.data.tags ? page.data.tags : [];
            tags.push(...pageTags);

            const rawLinkHeader =
                page && page.headers ? page.headers.link : undefined;
            const nextLink = parseNextLink(rawLinkHeader);
            hasNext = nextLink !== undefined;
            link = rawLinkHeader;
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
        link: string | undefined = undefined,
    ) {
        // Default items per page (not honoured by all registries)
        const itemsPerPage = 1000;
        const last = lastItem ? `&last=${lastItem}` : '';
        const url = link
            ? resolveNextPageUrl(image.registry.url, image.name, link)
            : `${image.registry.url}/${image.name}/tags/list?n=${itemsPerPage}${last}`;
        return this.callRegistry<RegistryTagsList>({
            image,
            url,
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
        let indexDigest: string | undefined;
        const response = await this.callRegistry<any>({
            image,
            url: `${image.registry.url}/${image.name}/manifests/${tagOrDigest}`,
            headers: {
                Accept: 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
            },
            resolveWithFullResponse: true,
        });
        const responseManifests: RegistryManifestResponse =
            response && response.data ? response.data : response;
        const rootContentDigest =
            response && response.headers
                ? response.headers['docker-content-digest']
                : undefined;
        if (responseManifests) {
            log.debug(`Found manifests [${JSON.stringify(responseManifests)}]`);
            if (isNonContainerArtifact(responseManifests)) {
                this.log.debug(
                    `${this.getId()} - Manifest for ${image.name}:${tagOrDigest} is a non-container OCI artifact`,
                );
                throw new UnsupportedArtifactError(
                    `Unsupported artifact: ${image.name}:${tagOrDigest} is a non-container OCI artifact`,
                );
            }
            if (responseManifests.schemaVersion === 2) {
                log.debug('Manifests found with schemaVersion = 2');
                const headerContentType = getHeaderContentType(
                    response && response.headers ? response.headers : undefined,
                );
                let effectiveMediaType =
                    (responseManifests.mediaType &&
                        responseManifests.mediaType.trim().toLowerCase()) ||
                    headerContentType;

                const isKnownMediaType =
                    effectiveMediaType ===
                        'application/vnd.docker.distribution.manifest.list.v2+json' ||
                    effectiveMediaType ===
                        'application/vnd.oci.image.index.v1+json' ||
                    effectiveMediaType ===
                        'application/vnd.docker.distribution.manifest.v2+json' ||
                    effectiveMediaType ===
                        'application/vnd.oci.image.manifest.v1+json';

                if (!isKnownMediaType) {
                    if (Array.isArray(responseManifests.manifests)) {
                        effectiveMediaType =
                            'application/vnd.oci.image.index.v1+json';
                    } else if (
                        responseManifests.config ||
                        Array.isArray(responseManifests.layers)
                    ) {
                        effectiveMediaType =
                            'application/vnd.oci.image.manifest.v1+json';
                    }
                }

                log.debug(
                    `Manifests media type detected [${effectiveMediaType}]`,
                );
                if (
                    effectiveMediaType ===
                        'application/vnd.docker.distribution.manifest.list.v2+json' ||
                    effectiveMediaType ===
                        'application/vnd.oci.image.index.v1+json'
                ) {
                    indexDigest =
                        rootContentDigest ||
                        (tagOrDigest.startsWith('sha256:')
                            ? tagOrDigest
                            : undefined);
                    log.debug(
                        `Filter manifest for [arch=${image.architecture}, os=${image.os}, variant=${image.variant}]`,
                    );
                    let manifestFound;
                    const manifestFounds = responseManifests.manifests
                        ? responseManifests.manifests.filter(
                              (manifest: any) =>
                                  manifest.platform &&
                                  manifest.platform.architecture ===
                                      image.architecture &&
                                  manifest.platform.os === image.os &&
                                  (!manifest.artifactType ||
                                      !manifest.artifactType.startsWith(
                                          'application/vnd.cncf.helm.',
                                      )) &&
                                  (!manifest.mediaType ||
                                      !manifest.mediaType.startsWith(
                                          'application/vnd.cncf.helm.',
                                      )),
                          )
                        : [];

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
                        manifestMediaType =
                            manifestFound.mediaType ||
                            'application/vnd.oci.image.manifest.v1+json';
                    }
                } else if (
                    effectiveMediaType ===
                        'application/vnd.docker.distribution.manifest.v2+json' ||
                    effectiveMediaType ===
                        'application/vnd.oci.image.manifest.v1+json'
                ) {
                    // Single-platform manifest (no list/index) => the reference
                    // we already fetched it by (tag or digest) *is* the manifest
                    // identifier. Do not use responseManifests.config.digest here;
                    // that's the digest of the config blob, not of the manifest,
                    // and is not a valid value to re-request a manifest with.
                    log.debug(
                        `Manifest found with [reference=${tagOrDigest}, mediaType=${effectiveMediaType}]`,
                    );
                    manifestDigestFound = tagOrDigest;
                    manifestMediaType = effectiveMediaType;
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
                const resolvedDigest =
                    responseManifest?.headers?.['docker-content-digest'] ||
                    manifestDigestFound;
                const manifestFound: RegistryManifest = {
                    digest: resolvedDigest,
                    version: 2,
                    ...(indexDigest ? { indexDigest } : {}),
                    // Only present when the fetched manifest carried it, i.e.
                    // not for a multi-arch index.
                    ...(configDigestFound
                        ? { configDigest: configDigestFound }
                        : {}),
                };
                log.debug(
                    `Manifest found with [digest=${manifestFound.digest}, indexDigest=${manifestFound.indexDigest}, version=${manifestFound.version}]`,
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
            if (manifest && isNonContainerArtifact(manifest)) {
                throw new UnsupportedArtifactError(
                    `Unsupported artifact: ${image.name}@${manifestDigest} is a non-container OCI artifact`,
                );
            }
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
        const axiosOptions: AxiosRequestConfig = applyProxyConfig(
            {
                url,
                method,
                headers: {
                    'User-Agent': getUserAgent(),
                    ...(headers || {}),
                },
                responseType: 'json',
            },
            this.configuration?.proxy,
        );
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

    /**
     * Run an image pull (done by the Docker daemon, not through callRegistry) under this
     * registry's pull limit: at most `pullconcurrency` pulls at once (default 1), started
     * in FIFO order, and none started while pulls are deferred after a rate limit.
     *
     * Pulls have their own limit instead of sharing the request permits: a pull holds its
     * slot for the whole download, which would starve the watcher's manifest checks.
     */
    async withPullPermit<T>(pull: () => Promise<T>): Promise<T> {
        if (
            this.activePulls >=
            (this.configuration.pullconcurrency ?? DEFAULT_PULL_CONCURRENCY)
        ) {
            await new Promise<void>((resolve) =>
                this.pendingPulls.push(resolve),
            );
        } else {
            this.activePulls += 1;
        }

        try {
            const wait = this.pullsDeferredUntil - Date.now();
            if (wait > 0) {
                await new Promise((resolve) => setTimeout(resolve, wait));
            }
            return await pull();
        } finally {
            const next = this.pendingPulls.shift();
            if (next) {
                next();
            } else {
                this.activePulls -= 1;
            }
        }
    }

    /**
     * Hold back every pull from this registry for `delayMs` (a pull was rate limited:
     * the next ones would only hit the same limit). Never shortens an existing deferral.
     */
    deferPulls(delayMs: number) {
        this.pullsDeferredUntil = Math.max(
            this.pullsDeferredUntil,
            Date.now() + delayMs,
        );
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

    getImageFullName(image: ContainerImage, tagOrDigest?: string) {
        const tag = tagOrDigest || image.tag?.value || 'latest';
        // digests are separated with @ whereas tags are separated with :
        const tagOrDigestWithSeparator =
            tag.indexOf(':') !== -1 ? `@${tag}` : `:${tag}`;
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

    /**
     * Resolve the first valid container image candidate tag from a list of candidate tags,
     * skipping non-container OCI artifacts (such as Helm charts).
     */
    async resolveCandidateTag(
        image: ContainerImage,
        tagsCandidates: string[],
        logContainer?: {
            info: (msg: string) => void;
            warn?: (msg: string) => void;
            debug?: (msg: string) => void;
        },
    ): Promise<CandidateTagResolution> {
        return resolveCandidateTag(this, image, tagsCandidates, logContainer);
    }
}

export default Registry;
