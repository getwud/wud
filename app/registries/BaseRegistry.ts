// @ts-nocheck
import Registry from './Registry';

/**
 * Base Registry with common patterns
 */
class BaseRegistry extends Registry {
    /**
     * Common URL normalization for registries that need https:// prefix and /v2 suffix
     */
    normalizeImageUrl(image, registryUrl = null) {
        const imageNormalized = { ...image };
        const url = registryUrl || image.registry.url;

        if (!url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${url}/v2`;
        }
        return imageNormalized;
    }

    /**
     * Common Basic Auth implementation
     */
    async authenticateBasic(requestOptions, credentials) {
        const requestOptionsWithAuth = { ...requestOptions };
        if (credentials) {
            requestOptionsWithAuth.headers.Authorization = `Basic ${credentials}`;
        }
        return requestOptionsWithAuth;
    }

    /**
     * Common Bearer token authentication
     */
    async authenticateBearer(requestOptions, token) {
        const requestOptionsWithAuth = { ...requestOptions };
        if (token) {
            requestOptionsWithAuth.headers.Authorization = `Bearer ${token}`;
        }
        return requestOptionsWithAuth;
    }

    /**
     * Common credentials helper for login/password or auth field
     */
    getAuthCredentials() {
        if (this.configuration.auth) {
            return this.configuration.auth;
        }
        if (this.configuration.login && this.configuration.password) {
            return BaseRegistry.base64Encode(
                this.configuration.login,
                this.configuration.password,
            );
        }
        return undefined;
    }

    /**
     * Common auth pull credentials
     */
    getAuthPull() {
        if (this.configuration.login && this.configuration.password) {
            return {
                username: this.configuration.login,
                password: this.configuration.password,
            };
        }
        if (this.configuration.username && this.configuration.token) {
            return {
                username: this.configuration.username,
                password: this.configuration.token,
            };
        }
        return undefined;
    }

    /**
     * Common URL pattern matching
     */
    matchUrlPattern(image, pattern) {
        return pattern.test(image.registry.url);
    }

    /**
     * Common mask configuration for sensitive fields
     */
    maskSensitiveFields(fields) {
        const masked = { ...this.configuration };
        fields.forEach((field) => {
            if (masked[field]) {
                masked[field] = BaseRegistry.mask(masked[field]);
            }
        });
        return masked;
    }
}

export default BaseRegistry;
