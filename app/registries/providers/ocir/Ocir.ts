import DockerRegistryV2 from '../../DockerRegistryV2';

/**
 * Oracle Cloud Infrastructure Registry (OCIR) integration.
 */
class Ocir extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?ocir\.io$/;

    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                username: this.joi.string(),
                password: this.joi.string(),
                token: this.joi.string(),
                auth: this.joi.string(),
            }),
        ]);
    }
}

export default Ocir;
