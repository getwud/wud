import axios, { AxiosRequestConfig } from 'axios';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { ContainerImage } from '../../../model/container';

/**
 * Google Container Registry integration.
 */
class Gcr extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?gcr.io$/;

    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                clientemail: this.joi.string().required(),
                privatekey: this.joi.string().required(),
            }),
        ]);
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
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
}

export default Gcr;
