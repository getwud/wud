import DockerRegistryV2 from '../../DockerRegistryV2';

/**
 * DigitalOcean Container Registry (DOCR) integration.
 */
class Docr extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?registry\.digitalocean\.com$/;

    getConfigurationSchema() {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                token: this.joi.string(),
                username: this.joi.string(),
                password: this.joi.string(),
                auth: this.joi.string(),
            }),
        ]);
    }

    getAuthCredentials(): string | undefined {
        if (
            this.configuration &&
            this.configuration.token &&
            !this.configuration.username &&
            !this.configuration.login
        ) {
            return DockerRegistryV2.base64Encode(
                this.configuration.token,
                this.configuration.token,
            );
        }
        return super.getAuthCredentials();
    }

    async getAuthPull() {
        if (
            this.configuration &&
            this.configuration.token &&
            !this.configuration.username &&
            !this.configuration.login
        ) {
            return {
                username: this.configuration.token,
                password: this.configuration.token,
            };
        }
        return super.getAuthPull();
    }
}

export default Docr;
