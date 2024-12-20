const component = require('./component');

/**
 * Init Router.
 * @returns {*}
 */
function init() {
    const router = component.init('registry');
    return router;
}

module.exports = {
    init,
};
