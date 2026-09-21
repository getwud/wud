import { ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr';
import { ContainerImage } from '../../../model/container';
import axios, { AxiosRequestConfig } from 'axios';
import joi from 'joi';
import { RegistryTagsList, getUserAgent } from '../../Registry';
import DockerRegistryV2 from '../../DockerRegistryV2';

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
export class Ecr extends DockerRegistryV2 {
    async init() {
        if (this.configuration.public === undefined) {
            this.configuration.public =
                this.name === 'public' || !this.configuration.accesskeyid;
        }
    }

    getConfigurationSchema(): joi.AlternativesSchema | joi.ObjectSchema {
        return this.joi.alternatives(
            this.joi.string().allow(''),
            this.joi.object<EcrConfiguration>().keys({
                accesskeyid: this.joi.string().when('public', {
                    is: true,
                    then: this.joi.optional(),
                    otherwise: this.joi.required(),
                }),
                secretaccesskey: this.joi.string().when('public', {
                    is: true,
                    then: this.joi.optional(),
                    otherwise: this.joi.required(),
                }),
                region: this.joi.string().when('public', {
                    is: true,
                    then: this.joi.optional().default('us-east-1'),
                    otherwise: this.joi.required(),
                }),
                accountid: this.joi.string().optional(),
                public: this.joi.boolean().optional().default(false),
            }),
        );
    }

    /**
     * Return true if image has not registryUrl.
     */
    match(imageUrl: string) {
        this.log.debug(`Matching image registry URL: ${imageUrl}`);

        // Check if the image registry URL matches ECR Public Gallery
        if (
            (this.configuration.public ||
                this.name === 'public' ||
                !this.configuration.accesskeyid) &&
            imageUrl === ECR_PUBLIC_GALLERY_HOSTNAME
        ) {
            return true;
        }

        // Public-only registry (without credentials) does not match private ECR URLs
        if (!this.configuration.accesskeyid) {
            return false;
        }

        // If account ID is provided, check if the image registry URL matches the account ID
        // Otherwise every ECR registry URL is considered a match
        if (this.configuration.accountid) {
            return new RegExp(
                `^${this.configuration.accountid}\\.dkr\\.ecr\\..*\\.amazonaws\\.com$`,
            ).test(imageUrl);
        } else {
            return /^.*\.dkr\.ecr\..*\.amazonaws\.com$/.test(imageUrl);
        }
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
        // Public ECR gallery in priority
        if (image.registry.url.includes(ECR_PUBLIC_GALLERY_HOSTNAME)) {
            const response = await axios({
                method: 'GET',
                url: 'https://public.ecr.aws/token/',
                headers: {
                    Accept: 'application/json',
                    'User-Agent': getUserAgent(),
                },
            });
            requestOptionsWithAuth.headers =
                requestOptionsWithAuth.headers || {};
            requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
            // Private registry
        } else if (this.configuration.accesskeyid) {
            if (this.tokenCache && this.tokenCache.expiresAt > new Date()) {
                requestOptionsWithAuth.headers =
                    requestOptionsWithAuth.headers || {};
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

                requestOptionsWithAuth.headers =
                    requestOptionsWithAuth.headers || {};
                requestOptionsWithAuth.headers.Authorization = `Basic ${tokenValue}`;
            }
        }
        return requestOptionsWithAuth;
    }

    getTagsPage(
        image: ContainerImage,
        _lastItem: string | undefined = undefined,
        link: string | undefined = undefined,
    ) {
        const itemsPerPage = 1000;
        const baseUrl = image.registry.url.includes(ECR_PUBLIC_GALLERY_HOSTNAME)
            ? 'https://public.ecr.aws'
            : image.registry.url.replace(/\/v2$/, '');

        if (link) {
            const linkUrl = link.match(/<(.+?)>/);
            if (linkUrl) {
                const targetUrl = linkUrl[1].startsWith('http')
                    ? linkUrl[1]
                    : `${baseUrl}${linkUrl[1]}`;
                return this.callRegistry<RegistryTagsList>({
                    image,
                    url: targetUrl,
                    resolveWithFullResponse: true,
                });
            }
        }
        return this.callRegistry<RegistryTagsList>({
            image,
            url: `${image.registry.url}/${image.name}/tags/list?n=${itemsPerPage}`,
            resolveWithFullResponse: true,
        });
    }
}

export default Ecr;
