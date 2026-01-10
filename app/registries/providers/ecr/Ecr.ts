// @ts-nocheck
import ECR from 'aws-sdk/clients/ecr';
import maintenanceMode from 'aws-sdk/lib/maintenance_mode_message';
// @ts-ignore
maintenanceMode.suppress = true; // Disable aws sdk maintenance mode message at startup
import axios from 'axios';
import Registry from '../../Registry';

const ECR_PUBLIC_GALLERY_HOSTNAME = 'public.ecr.aws';

/**
 * Elastic Container Registry integration.
 */
class Ecr extends Registry {
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
     * @returns {*}
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
     * @returns {boolean}
     */

    match(image) {
        return (
            /^.*\.dkr\.ecr\..*\.amazonaws\.com$/.test(image.registry.url) ||
            image.registry.url === ECR_PUBLIC_GALLERY_HOSTNAME
        );
    }

    /**
     * Normalize image according to AWS ECR characteristics.
     * @param image
     * @returns {*}
     */

    normalizeImage(image) {
        const imageNormalized = image;
        if (!imageNormalized.registry.url.startsWith('https://')) {
            imageNormalized.registry.url = `https://${imageNormalized.registry.url}/v2`;
        }
        return imageNormalized;
    }

    async authenticate(image, requestOptions) {
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
                authorizationToken.authorizationData[0].authorizationToken;

            requestOptionsWithAuth.headers.Authorization = `Basic ${tokenValue}`;

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

    getAuthPull() {
        return this.configuration.accesskeyid
            ? {
                  username: this.configuration.accesskeyid,
                  password: this.configuration.secretaccesskey,
              }
            : undefined;
    }
}

export default Ecr;
