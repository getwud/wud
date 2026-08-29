import DockerRegistryV2 from '../../DockerRegistryV2';

/**
 * Alibaba Cloud Container Registry (ACR / Aliyun) integration.
 */
class Alibaba extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?aliyuncs\.com$/;

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

export default Alibaba;
