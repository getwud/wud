import Ghcr from '../ghcr/Ghcr';

/**
 * Linux-Server Container Registry integration.
 */
class Lscr extends Ghcr {
    protected registryPattern = /^.*\.?lscr.io$/;

    getConfigurationSchema() {
        return this.joi.object().keys({
            username: this.joi.string().required(),
            token: this.joi.string().required(),
        });
    }
}

export default Lscr;
