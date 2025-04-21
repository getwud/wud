import ECR from 'aws-sdk/clients/ecr';
import awsSdk from 'aws-sdk/lib/maintenance_mode_message';
awsSdk.suppress = true; // Disable aws sdk maintenance mode message at startup
import rp, { RequestPromiseOptions } from 'request-promise-native';
import { Registry } from '../../Registry';
import { ContainerImage } from '../../../model/container';

const ECR_PUBLIC_GALLERY_HOSTNAME = 'public.ecr.aws';

export interface EcrConfiguration {
    accesskeyid: string;
    secretaccesskey: string;
    region: string;
}


/**
 * Elastic Container Registry integration.
 */
export class Ecr extends Registry<EcrConfiguration> {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                accesskeyid: this.joi.string().required(),
                secretaccesskey: this.joi.string().required(),
                region: this.joi.string().required(),
            }),
        ]);
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
        return (
            /^.*\.dkr\.ecr\..*\.amazonaws\.com$/.test(image.registry.url) ||
            image.registry.url === ECR_PUBLIC_GALLERY_HOSTNAME
        );
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

    async authenticate(image: ContainerImage, requestOptions: RequestPromiseOptions) {
        const requestOptionsWithAuth = requestOptions;
        // Private registry
        if (this.configuration.accesskeyid) {
            const ecr = new ECR({
                credentials: {
                    accessKeyId: this.configuration.accesskeyid,
                    secretAccessKey: this.configuration.secretaccesskey,
                },
                region: this.configuration.region,
            });
            const authorizationToken = await ecr
                .getAuthorizationToken()
                .promise();
            const tokenValue =
                authorizationToken.authorizationData![0].authorizationToken;

            requestOptionsWithAuth.headers!.Authorization = `Basic ${tokenValue}`;

            // Public ECR gallery
        } else if (image.registry.url.includes(ECR_PUBLIC_GALLERY_HOSTNAME)) {
            const response = await rp({
                method: 'GET',
                uri: 'https://public.ecr.aws/token/',
                headers: {
                    Accept: 'application/json',
                },
                json: true,
            });
            requestOptionsWithAuth.headers!.Authorization = `Bearer ${response.token}`;
        }
        return requestOptionsWithAuth;
    }

    getAuthPull() {
        return this.configuration.accesskeyid
            ? {
                username: this.configuration.accesskeyid,
                password: this.configuration.secretaccesskey,
            }
            : undefined;
    }
}
