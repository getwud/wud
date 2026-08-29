import DockerRegistryV2 from '../../DockerRegistryV2';

/**
 * IBM Cloud Container Registry (ICR) integration.
 */
class Icr extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?icr\.io$/;

    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                apikey: this.joi.string(),
                username: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
                auth: this.joi.string(),
            }),
        ]);
    }
}

export default Icr;
