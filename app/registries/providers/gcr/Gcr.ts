// @ts-nocheck
import axios from 'axios';
import BaseRegistry from '../../BaseRegistry';

/**
 * Google Container Registry integration.
 */
class Gcr extends BaseRegistry {
    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                clientemail: this.joi.string().required(),
                privatekey: this.joi.string().required(),
            }),
        ]);
    }

    maskConfiguration() {
        return this.maskSensitiveFields(['privatekey']);
    }

    match(image) {
        return this.matchUrlPattern(image, /^.*\.?gcr.io$/);
    }

    normalizeImage(image) {
        return this.normalizeImageUrl(image);
    }

    async authenticate(image, requestOptions) {
        if (!this.configuration.clientemail) {
            return requestOptions;
        }
        const request = {
            method: 'GET',
            url: `https://gcr.io/v2/token?scope=repository:${image.name}:pull`,
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${Gcr.base64Encode(
                    '_json_key',
                    JSON.stringify({
                        client_email: this.configuration.clientemail,
                        private_key: this.configuration.privatekey,
                    }),
                )}`,
            },
        };

        const response = await axios(request);
        const requestOptionsWithAuth = requestOptions;
        requestOptionsWithAuth.headers.Authorization = `Bearer ${response.data.token}`;
        return requestOptionsWithAuth;
    }

    getAuthPull() {
        return {
            username: this.configuration.clientemail,
            password: this.configuration.privatekey,
        };
    }
}

export default Gcr;
