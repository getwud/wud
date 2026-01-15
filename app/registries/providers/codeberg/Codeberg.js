const Forgejo = require('../forgejo/Forgejo');

/**
 * Codeberg Container Registry integration.
 */
class Codeberg extends Forgejo {
    init() {
        this.configuration.url = 'https://codeberg.org';
    }
}

module.exports = Codeberg;
