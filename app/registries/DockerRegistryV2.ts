import axios, { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../model/container';
import Registry, { getUserAgent } from './Registry';
import { applyProxyConfig, maskProxy } from '../http/proxy';

/**
 * A parsed `WWW-Authenticate: Bearer ...` challenge, per the OCI
 * Distribution Spec / Docker Registry HTTP API V2 auth flow.
 */
export interface BearerChallenge {
    realm?: string;
    service?: string;
    scope?: string;
}

/**
 * Docker Registry V2 Base class.
 * Implements common patterns and behaviors specified by Docker Registry HTTP API V2.
 */
export class DockerRegistryV2 extends Registry {
    /**
     * Regex pattern used to match image URLs.
     */
    protected registryPattern?: RegExp;

    /**
     * List of sensitive configuration field names to mask.
     */
    protected sensitiveFields: string[] = [
        'password',
        'token',
        'auth',
        'clientsecret',
        'secretaccesskey',
        'accesskeyid',
        'privatekey',
        'secretkey',
        'apikey',
    ];

    /**
     * Return true if this registry matches the image url.
     */
    match(imageUrl: string): boolean {
        if (!imageUrl) {
            return false;
        }
        if (this.registryPattern) {
            return this.registryPattern.test(imageUrl);
        }
        if (this.configuration && this.configuration.url) {
            return this.configuration.url.includes(imageUrl);
        }
        return false;
    }

    /**
     * Common URL normalization for registries that need https:// prefix and /v2 suffix.
     */
    normalizeImage(image: ContainerImage): ContainerImage {
        const imageNormalized = {
            ...image,
            registry: { ...image.registry },
        };
        if (
            imageNormalized.registry.url &&
            !imageNormalized.registry.url.startsWith('https://')
        ) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }

    /**
     * Backward-compatible alias for normalizeImage.
     */
    normalizeImageUrl(
        image: ContainerImage,
        registryUrl: string | null = null,
    ): ContainerImage {
        const imageNormalized = {
            ...image,
            registry: { ...image.registry },
        };
        const url = registryUrl || imageNormalized.registry.url;

        if (url && !url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${url}/v2`;
        }
        return imageNormalized;
    }

    /**
     * Mask sensitive fields from configuration.
     */
    maskConfiguration(): Record<string, any> {
        if (!this.configuration || typeof this.configuration !== 'object') {
            return {};
        }
        const masked = { ...this.configuration };
        this.sensitiveFields.forEach((field) => {
            if (masked[field]) {
                masked[field] = DockerRegistryV2.mask(masked[field]);
            }
        });
        if (masked.proxy) {
            masked.proxy = maskProxy(masked.proxy);
        }
        return masked;
    }

    /**
     * Backward-compatible mask configuration for sensitive fields.
     */
    maskSensitiveFields(fields: string[]): Record<string, any> {
        const masked = { ...this.configuration };
        fields.forEach((field) => {
            if (masked[field]) {
                masked[field] = DockerRegistryV2.mask(masked[field]);
            }
        });
        return masked;
    }

    /**
     * Common Basic Auth implementation.
     */
    async authenticateBasic(
        requestOptions: AxiosRequestConfig,
        credentials?: string,
    ): Promise<AxiosRequestConfig> {
        const requestOptionsWithAuth = {
            ...requestOptions,
            headers: { ...requestOptions.headers },
        };
        if (credentials) {
            requestOptionsWithAuth.headers.Authorization = `Basic ${credentials}`;
        }
        return requestOptionsWithAuth;
    }

    /**
     * Common Bearer token authentication.
     */
    async authenticateBearer(
        requestOptions: AxiosRequestConfig,
        token?: string,
    ): Promise<AxiosRequestConfig> {
        const requestOptionsWithAuth = {
            ...requestOptions,
            headers: { ...requestOptions.headers },
        };
        if (token) {
            requestOptionsWithAuth.headers.Authorization = `Bearer ${token}`;
        }
        return requestOptionsWithAuth;
    }

    /**
     * Common credentials helper for login/password, username/token, auth, etc.
     */
    getAuthCredentials(): string | undefined {
        if (!this.configuration) {
            return undefined;
        }
        if (this.configuration.auth) {
            return this.configuration.auth;
        }
        if (this.configuration.login && this.configuration.password) {
            return DockerRegistryV2.base64Encode(
                this.configuration.login,
                this.configuration.password,
            );
        }
        if (this.configuration.login && this.configuration.token) {
            return DockerRegistryV2.base64Encode(
                this.configuration.login,
                this.configuration.token,
            );
        }
        if (
            this.configuration.username !== undefined &&
            this.configuration.password
        ) {
            return DockerRegistryV2.base64Encode(
                this.configuration.username,
                this.configuration.password,
            );
        }
        if (
            this.configuration.username !== undefined &&
            this.configuration.token
        ) {
            return DockerRegistryV2.base64Encode(
                this.configuration.username,
                this.configuration.token,
            );
        }
        if (this.configuration.clientid && this.configuration.clientsecret) {
            return DockerRegistryV2.base64Encode(
                this.configuration.clientid,
                this.configuration.clientsecret,
            );
        }
        if (
            this.configuration.namespace &&
            this.configuration.account &&
            this.configuration.token
        ) {
            return DockerRegistryV2.base64Encode(
                `${this.configuration.namespace}+${this.configuration.account}`,
                this.configuration.token,
            );
        }
        if (this.configuration.apikey) {
            return DockerRegistryV2.base64Encode(
                this.configuration.username || 'iamapikey',
                this.configuration.apikey,
            );
        }
        if (this.configuration.secretkey) {
            return DockerRegistryV2.base64Encode(
                this.configuration.username || 'nologin',
                this.configuration.secretkey,
            );
        }
        return undefined;
    }

    /**
     * Authenticate and set authentication value to requestOptions.
     * Default implementation applies Basic auth if credentials are available.
     */
    async authenticate(
        _image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ): Promise<AxiosRequestConfig> {
        const credentials = this.getAuthCredentials();
        if (credentials) {
            return this.authenticateBasic(requestOptions, credentials);
        }
        return requestOptions;
    }

    /**
     * Common auth pull credentials.
     */
    async getAuthPull(): Promise<
        { username?: string; password?: string } | undefined
    > {
        if (!this.configuration) {
            return undefined;
        }
        if (this.configuration.login && this.configuration.password) {
            return {
                username: this.configuration.login,
                password: this.configuration.password,
            };
        }
        if (
            this.configuration.username !== undefined &&
            this.configuration.password
        ) {
            return {
                username: this.configuration.username,
                password: this.configuration.password,
            };
        }
        if (
            this.configuration.username !== undefined &&
            this.configuration.token
        ) {
            return {
                username: this.configuration.username,
                password: this.configuration.token,
            };
        }
        if (this.configuration.clientid && this.configuration.clientsecret) {
            return {
                username: this.configuration.clientid,
                password: this.configuration.clientsecret,
            };
        }
        if (this.configuration.clientemail && this.configuration.privatekey) {
            return {
                username: this.configuration.clientemail,
                password: this.configuration.privatekey,
            };
        }
        if (
            this.configuration.accesskeyid &&
            this.configuration.secretaccesskey
        ) {
            return {
                username: this.configuration.accesskeyid,
                password: this.configuration.secretaccesskey,
            };
        }
        if (
            this.configuration.namespace &&
            this.configuration.account &&
            this.configuration.token
        ) {
            return {
                username: `${this.configuration.namespace}+${this.configuration.account}`,
                password: this.configuration.token,
            };
        }
        if (this.configuration.apikey) {
            return {
                username: this.configuration.username || 'iamapikey',
                password: this.configuration.apikey,
            };
        }
        if (this.configuration.secretkey) {
            return {
                username: this.configuration.username || 'nologin',
                password: this.configuration.secretkey,
            };
        }
        return undefined;
    }

    /**
     * Common URL pattern matching.
     */
    matchUrlPattern(imageUrl: string, pattern: RegExp): boolean {
        return pattern.test(imageUrl);
    }

    /**
     * Parse a `WWW-Authenticate: Bearer realm="...",service="...",scope="..."`
     * challenge header, as returned by any OCI Distribution Spec-compliant
     * registry on a 401 response.
     */
    static parseBearerChallenge(header?: string): BearerChallenge | undefined {
        if (!header) {
            return undefined;
        }
        const match = /^\s*Bearer\s+(.*)$/i.exec(header);
        if (!match) {
            return undefined;
        }
        const challenge: BearerChallenge = {};
        const paramPattern = /([a-zA-Z0-9_]+)="([^"]*)"/g;
        let paramMatch = paramPattern.exec(match[1]);
        while (paramMatch !== null) {
            const [, key, value] = paramMatch;
            if (key === 'realm' || key === 'service' || key === 'scope') {
                challenge[key] = value;
            }
            paramMatch = paramPattern.exec(match[1]);
        }
        return challenge.realm ? challenge : undefined;
    }

    /**
     * Cache for Bearer tokens to avoid authenticating on every single request.
     * Key: `${registryUrl}:::${imageName}:::${credentials}`
     */
    private bearerTokenCache: Map<
        string,
        { token: string; expiresAt: number }
    > = new Map();

    /**
     * Clear cached bearer tokens.
     */
    clearBearerTokenCache(): void {
        this.bearerTokenCache.clear();
    }

    /**
     * Return a non-expired cached bearer token, if one exists.
     */
    getCachedBearerToken(
        image: ContainerImage | undefined,
        registryUrl: string,
        credentials?: string,
    ): string | undefined {
        const cacheKey = `${registryUrl}:::${image?.name || ''}:::${credentials || ''}`;
        const cached = this.bearerTokenCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.token;
        }
        return undefined;
    }

    /**
     * Probe the registry for its `WWW-Authenticate` challenge header via GET /v2/.
     * Returns a parsed BearerChallenge if the registry challenged with 401 and
     * a Bearer realm, or undefined if no auth is required or if the challenge is
     * not a Bearer challenge (e.g. Basic auth).
     */
    async getBearerChallenge(
        registryUrl: string,
    ): Promise<BearerChallenge | undefined> {
        const pingConfig: AxiosRequestConfig = applyProxyConfig(
            {
                method: 'GET',
                url: `${registryUrl}/v2/`,
                headers: { 'User-Agent': getUserAgent() },
            },
            this.configuration?.proxy,
        );

        let challengeHeader: string | undefined;
        try {
            await axios(pingConfig);
            // No 401 raised means no auth is required.
            return undefined;
        } catch (error: any) {
            if (error?.response?.status !== 401) {
                return undefined;
            }
            challengeHeader =
                error.response.headers?.['www-authenticate'] ||
                error.response.headers?.['WWW-Authenticate'];
        }

        return DockerRegistryV2.parseBearerChallenge(challengeHeader);
    }

    /**
     * Perform the Bearer token exchange described by the OCI Distribution Spec /
     * Docker Registry HTTP API V2: probe the registry for its WWW-Authenticate
     * challenge, then fetch a Bearer token from the realm it declares.
     *
     * If credentials (base64-encoded login:password) are provided, HTTP Basic
     * authentication is sent to the realm URL.
     *
     * Returns undefined if the registry requires no auth, if the challenge
     * is not a Bearer challenge (e.g. Basic auth), or if the exchange fails.
     */
    async getBearerToken(
        image: ContainerImage | undefined,
        registryUrl: string,
        credentials?: string,
        challenge?: BearerChallenge,
    ): Promise<string | undefined> {
        const cacheKey = `${registryUrl}:::${image?.name || ''}:::${credentials || ''}`;
        const cached = this.bearerTokenCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.token;
        }

        const effectiveChallenge =
            challenge || (await this.getBearerChallenge(registryUrl));
        if (!effectiveChallenge?.realm) {
            return undefined;
        }

        const query = new URLSearchParams();
        if (effectiveChallenge.service) {
            query.set('service', effectiveChallenge.service);
        }
        const scope =
            effectiveChallenge.scope ||
            (image?.name ? `repository:${image.name}:pull` : undefined);
        if (scope) {
            query.set('scope', scope);
        }

        const headers: Record<string, string> = {
            Accept: 'application/json',
            'User-Agent': getUserAgent(),
        };
        if (credentials) {
            headers.Authorization = `Basic ${credentials}`;
        }

        const queryString = query.toString();
        const tokenUrl = queryString
            ? `${effectiveChallenge.realm}${effectiveChallenge.realm.includes('?') ? '&' : '?'}${queryString}`
            : effectiveChallenge.realm;

        const tokenConfig: AxiosRequestConfig = applyProxyConfig(
            {
                method: 'GET',
                url: tokenUrl,
                headers,
            },
            this.configuration?.proxy,
        );

        try {
            const response = await axios(tokenConfig);
            // Most registries return `token`; some (e.g. docker.elastic.co)
            // non-conformantly return `access_token` instead.
            const token = response.data?.token || response.data?.access_token;
            if (token) {
                const expiresIn = response.data?.expires_in;
                const ttlSeconds =
                    typeof expiresIn === 'number' && expiresIn > 0
                        ? expiresIn > 10
                            ? expiresIn - 5
                            : expiresIn
                        : 60;
                const expiresAt = Date.now() + ttlSeconds * 1000;
                this.bearerTokenCache.set(cacheKey, { token, expiresAt });
            }
            return token;
        } catch (error: any) {
            const article = credentials ? 'a' : 'an';
            const tokenType = credentials ? 'bearer' : 'anonymous';
            this.log.warn(
                `Error when trying to get ${article} ${tokenType} access token (${error.message})`,
            );
            return undefined;
        }
    }

    /**
     * Backward-compatible helper for anonymous Bearer token exchange.
     */
    async getAnonymousBearerToken(
        image: ContainerImage,
        registryUrl: string,
    ): Promise<string | undefined> {
        return this.getBearerToken(image, registryUrl);
    }
}

export default DockerRegistryV2;
