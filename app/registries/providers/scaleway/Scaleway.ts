import DockerRegistryV2 from '../../DockerRegistryV2';

/**
 * Scaleway Container Registry integration.
 */
class Scaleway extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?scw\.cloud$/;

    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                secretkey: this.joi.string(),
                username: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
                auth: this.joi.string(),
            }),
        ]);
    }
}

export default Scaleway;
