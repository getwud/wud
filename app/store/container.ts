/**
 * Container store.
 */
import { byString, byValues } from 'sort-es';
import logger from '../log';
import { Container, validate as validateContainer } from '../model/container';
import * as events from '../event';

const log = logger.child({ component: 'store' });
let containers: Collection<LokiData<Container>>;

/**
 * Create container collections.
 * @param db
 */
export function createCollections(db: Loki) {
    containers = db.getCollection('containers');
    if (containers === null) {
        log.info('Create Collection containers');
        containers = db.addCollection<LokiData<Container>>('containers');
    }
}

/**
 * Insert new Container.
 * @param container
 */
export function insertContainer(container: Container) {
    const containerToSave = validateContainer(container);
    containers.insert({
        data: containerToSave
    });
    events.emitContainerAdded(containerToSave);
    return containerToSave;
}

/**
 * Update existing container.
 * @param container
 */
export function updateContainer(container: Container) {
    const containerToReturn = validateContainer(container);

    // Remove existing container
    containers
        .chain()
        .find({
            'data.id': container.id,
        } as any)
        .remove();

    // Insert new one
    containers.insert({ data: containerToReturn });
    events.emitContainerUpdated(containerToReturn);
    return containerToReturn;
}

/**
 * Get all (filtered) containers.
 * @param query
 */
export function getContainers(query: Query = {}) {
    const filter: Query = {};
    Object.keys(query).forEach((key) => {
        filter[`data.${key}`] = query[key];
    });
    if (!containers) {
        return [];
    }
    const containerList = containers
        .find(filter)
        .map((item) => validateContainer(item.data));
    return containerList.sort(
        byValues([
            [(container) => container.watcher, byString()],
            [(container) => container.name, byString()],
            [(container) => container.image.tag.value, byString()],
        ]),
    );
}

/**
 * Get container by id.
 * @param id
 */
export function getContainer(id: string) {
    const container = containers.findOne({
        'data.id': id,
    } as any);

    if (container !== null) {
        return validateContainer(container.data);
    }
    return undefined;
}

/**
 * Delete container by id.
 * @param id
 */
export function deleteContainer(id: string) {
    const container = getContainer(id);
    if (container) {
        containers
            .chain()
            .find({
                'data.id': id,
            } as any)
            .remove();
        events.emitContainerRemoved(container);
    }
}

export interface Query {
    [key: string]: undefined | string | Query | (string | Query)[];
}

export interface LokiData<T> {
    data: T;
}