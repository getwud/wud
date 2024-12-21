const log = require('../log').child({ component: 'store' });
const { getContainers, deleteContainer } = require('./container');

/**
 * Delete all containers from state.
 */
function deleteAllContainersFromState() {
    log.info('Incompatible state found; reset');
    getContainers({}).forEach((container) => deleteContainer(container.id));
}

/**
 * Data migration function.
 * @param from version
 * @param to version
 */
function migrate(from, to) {
    log.info(`Migrate data from version ${from} to version ${to}`);
    if (from && !from.startsWith('8') && to && to.startsWith('8')) {
        deleteAllContainersFromState();
    }
}

module.exports = {
    migrate,
};
