import { AnySchema } from 'joi';
import { AxiosRequestConfig } from 'axios';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Docker Custom Registry V2 integration.
 */
class Custom extends DockerRegistryV2 {
    getConfigurationSchema(): AnySchema<any> {
        return this.joi.object().keys({
            icon: this.joi.string().default('si-opencontainersinitiative'),
            url: this.joi.string().uri().required(),
            login: this.joi.alternatives().conditional('password', {
                not: undefined,
                then: this.joi.string().required(),
                otherwise: this.joi.any().forbidden(),
            }),
            password: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.string().required(),
                otherwise: this.joi.any().forbidden(),
            }),
            token: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.any().forbidden(),
                otherwise: this.joi.alternatives().conditional('auth', {
                    not: undefined,
                    then: this.joi.any().forbidden(),
                    otherwise: this.joi.string(),
                }),
            }),
            auth: this.joi.alternatives().conditional('login', {
                not: undefined,
                then: this.joi.any().forbidden(),
                otherwise: this.joi
                    .alternatives()
                    .try(
                        this.joi.string().base64(),
                        this.joi.string().valid(''),
                    ),
            }),
        });
    }

    maskConfiguration() {
        return this.maskSensitiveFields(['password', 'token', 'auth']);
    }

    /**
     * Return true if image has no registry url.
     */
    match(imageUrl: string) {
        return this.configuration.url.indexOf(imageUrl) !== -1;
    }

    /**
     * Normalize images according to Custom characteristics.
     */
    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        imageNormalized.registry.url = `${this.configuration.url}/v2`;
        return imageNormalized;
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        if (this.configuration.token) {
            return this.authenticateBearer(
                requestOptions,
                this.configuration.token,
            );
        }

        const credentials = this.getAuthCredentials();

        // 1. Return cached bearer token if available
        const cachedToken = this.getCachedBearerToken(
            image,
            this.configuration.url,
            credentials,
        );
        if (cachedToken) {
            return this.authenticateBearer(requestOptions, cachedToken);
        }

        // 2. Probe registry for WWW-Authenticate challenge
        const challenge = await this.getBearerChallenge(this.configuration.url);

        if (challenge?.realm) {
            // Registry challenged with Bearer auth; perform bearer token exchange
            const token = await this.getBearerToken(
                image,
                this.configuration.url,
                credentials,
                challenge,
            );
            if (token) {
                return this.authenticateBearer(requestOptions, token);
            }
            // Challenge was Bearer but exchange failed (e.g. 401 from realm)
            return requestOptions;
        }

        // 3. Registry does not challenge or challenged with non-Bearer (e.g. Basic)
        if (credentials) {
            return this.authenticateBasic(requestOptions, credentials);
        }

        return requestOptions;
    }
}

export default Custom;
