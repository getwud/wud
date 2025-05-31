import { ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr';
import { ContainerImage } from '../../../model/container';
import axios, { AxiosRequestConfig } from 'axios';
import joi from 'joi';
import Registry from '../../Registry';

const ECR_PUBLIC_GALLERY_HOSTNAME = 'public.ecr.aws';

export interface EcrConfiguration {
    accesskeyid?: string;
    secretaccesskey?: string;
    region?: string;
    accountid?: string;
    public: boolean;
}

/**
 * Elastic Container Registry integration.
 */
export class Ecr extends Registry {
    getConfigurationSchema(): joi.AlternativesSchema | joi.ObjectSchema {
        return this.joi.alternatives(
            this.joi.string().allow(''),
            this.joi.object<EcrConfiguration>().keys({
                accesskeyid: this.joi.string().required(),
                secretaccesskey: this.joi.string().required(),
                region: this.joi.string().required(),
                accountid: this.joi.string().optional(),
                public: this.joi.boolean().optional().default(false),
            }),
        );
    }

    /**
     * Sanitize sensitive data
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            accesskeyid: Ecr.mask(this.configuration.accesskeyid),
            secretaccesskey: Ecr.mask(this.configuration.secretaccesskey),
            region: this.configuration.region,
        };
    }

    /**
     * Return true if image has not registryUrl.
     * @param image the image
     */

    match(image: ContainerImage) {
        this.log.debug(`Matching image registry URL: ${image.registry.url}`);

        // Check if the image registry URL matches ECR or ECR Public Gallery
        if (
            this.configuration.public &&
            image.registry.url === ECR_PUBLIC_GALLERY_HOSTNAME
        ) {
            return true;
        }

        // If account ID is provided, check if the image registry URL matches the account ID
        // Otherwise every ECR registry URL is considered a match
        if (this.configuration.accountid) {
            return new RegExp(
                `^${this.configuration.accountid}\\.dkr\\.ecr\\..*\\.amazonaws\\.com$`,
            ).test(image.registry.url);
        } else {
            return /^.*\.dkr\.ecr\..*\.amazonaws\.com$/.test(
                image.registry.url,
            );
        }
    }

    /**
     * Normalize image according to AWS ECR characteristics.
     * @param image
     */

    normalizeImage(image: ContainerImage) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }

    private tokenCache?: {
        token: string;
        expiresAt: Date;
    };

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        const requestOptionsWithAuth = requestOptions;
        // Private registry
        if (this.configuration.accesskeyid) {
            if (this.tokenCache && this.tokenCache.expiresAt > new Date()) {
                requestOptionsWithAuth.headers.Authorization = `Basic ${this.tokenCache.token}`;
            } else {
                const ecr = new ECRClient({
                    credentials: {
                        accessKeyId: this.configuration.accesskeyid,
                        secretAccessKey: this.configuration.secretaccesskey,
                        accountId: image.registry.url.split('.')[0], // Extract account ID from the URL
                    },
                    region: this.configuration.region,
                });
                const authorizationToken = await ecr.send(
                    new GetAuthorizationTokenCommand(),
                );

                const tokenValue =
                    authorizationToken.authorizationData[0].authorizationToken;
                this.tokenCache = {
                    token: tokenValue!,
                    expiresAt: new Date(
                        authorizationToken.authorizationData[0].expiresAt!,
                    ),
                };

                requestOptionsWithAuth.headers.Authorization = `Basic ${tokenValue}`;
            }
            // Public ECR gallery
        } else if (image.registry.url.includes(ECR_PUBLIC_GALLERY_HOSTNAME)) {
            const response = await axios({
                method: 'GET',
                url: 'https://public.ecr.aws/token/',
                headers: {
                    Accept: 'application/json',
                },
            });
            requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
        }
        return requestOptionsWithAuth;
    }

    async getAuthPull() {
        return this.configuration.accesskeyid
            ? {
                  username: this.configuration.accesskeyid,
                  password: this.configuration.secretaccesskey,
              }
            : undefined;
    }
}

export default Ecr;
