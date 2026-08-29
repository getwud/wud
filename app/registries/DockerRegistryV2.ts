import { AxiosRequestConfig } from 'axios';
import { ContainerImage } from '../model/container';
import Registry from './Registry';

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
        return undefined;
    }

    /**
     * Common URL pattern matching.
     */
    matchUrlPattern(imageUrl: string, pattern: RegExp): boolean {
        return pattern.test(imageUrl);
    }
}

export default DockerRegistryV2;
