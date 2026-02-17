const Quay = require('../quay/Quay');

/**
 * TrueForge Container Registry integration.
 */
class Trueforge extends Quay {
    match(image) {
        return /^.*\.?oci\.trueforge\.org$/.test(image.registry.url);
    }
}

module.exports = Trueforge;
