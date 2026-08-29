import DockerRegistryV2 from '../../DockerRegistryV2';

/**
 * Azure Container Registry integration.
 */
class Acr extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?azurecr.io$/;

    getConfigurationSchema() {
        return this.joi.object().keys({
            clientid: this.joi.string().required(),
            clientsecret: this.joi.string().required(),
        });
    }
}

export default Acr;
