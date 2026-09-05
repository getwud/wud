import * as container from './container';
import * as event from '../event';
import { initDatabase, closeDatabase } from './db';

jest.mock('../event');

describe('Container Store (SQLite)', () => {
    beforeEach(() => {
        closeDatabase();
        initDatabase(':memory:');
        jest.clearAllMocks();
    });

    afterAll(() => {
        closeDatabase();
    });

    const sampleContainer = {
        id: 'container-123456789',
        name: 'test',
        displayName: 'test',
        displayIcon: 'mdi:docker',
        status: 'running',
        watcher: 'docker-local',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'registry',
                url: 'https://hub.docker.com',
            },
            name: 'organization/image',
            tag: {
                value: '1.0.0',
                semver: true,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'amd64',
            os: 'linux',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '1.1.0',
        },
    };

    test('insertContainer should insert container and emit an event', () => {
        const spyEvent = jest.spyOn(event, 'emitContainerAdded');
        const inserted = container.insertContainer(sampleContainer);

        expect(inserted.id).toEqual(sampleContainer.id);
        expect(inserted.name).toEqual(sampleContainer.name);
        expect(spyEvent).toHaveBeenCalled();

        const fetched = container.getContainer(sampleContainer.id);
        expect(fetched).toBeDefined();
        expect(fetched?.name).toEqual(sampleContainer.name);
        expect(fetched?.image.tag.value).toEqual('1.0.0');
        expect(fetched?.result?.tag).toEqual('1.1.0');
        expect(fetched?.updateAvailable).toBe(true);
    });

    test('updateContainer should update container, record history and emit an event', () => {
        container.insertContainer(sampleContainer);

        const spyEvent = jest.spyOn(event, 'emitContainerUpdated');
        const updatedPayload = {
            ...sampleContainer,
            name: 'updated-name',
            result: {
                tag: '1.2.0',
            },
        };

        const updated = container.updateContainer(updatedPayload);
        expect(updated.name).toEqual('updated-name');
        expect(spyEvent).toHaveBeenCalled();

        const fetched = container.getContainer(sampleContainer.id);
        expect(fetched?.name).toEqual('updated-name');
        expect(fetched?.result?.tag).toEqual('1.2.0');

        const history = container.getContainerHistory(sampleContainer.id);
        expect(history.length).toBe(2);
        expect(history[0].tag).toBe('1.2.0');
        expect(history[1].tag).toBe('1.1.0');
    });

    test('updateContainer with same result should touch timestamp without duplicating history', () => {
        container.insertContainer(sampleContainer);

        container.updateContainer({
            ...sampleContainer,
        });

        const history = container.getContainerHistory(sampleContainer.id);
        expect(history.length).toBe(1);
    });

    test('getContainers should return all containers sorted by watcher, name, and image tag', () => {
        container.insertContainer({
            ...sampleContainer,
            id: 'c3',
            name: 'container3',
        });
        container.insertContainer({
            ...sampleContainer,
            id: 'c1',
            name: 'container1',
        });
        container.insertContainer({
            ...sampleContainer,
            id: 'c2',
            name: 'container2',
        });

        const results = container.getContainers();
        expect(results.length).toBe(3);
        expect(results[0].name).toEqual('container1');
        expect(results[1].name).toEqual('container2');
        expect(results[2].name).toEqual('container3');
    });

    test('getContainers with filter query should filter containers', () => {
        container.insertContainer({
            ...sampleContainer,
            id: 'c1',
            name: 'target-name',
        });
        container.insertContainer({
            ...sampleContainer,
            id: 'c2',
            name: 'other-name',
        });

        const results = container.getContainers({ name: 'target-name' });
        expect(results.length).toBe(1);
        expect(results[0].id).toBe('c1');
    });

    test('getContainer should return undefined when not found', () => {
        const result = container.getContainer('non-existent-id');
        expect(result).toBeUndefined();
    });

    test('deleteContainer should delete container and emit an event', () => {
        container.insertContainer(sampleContainer);
        const spyEvent = jest.spyOn(event, 'emitContainerRemoved');

        container.deleteContainer(sampleContainer.id);

        expect(spyEvent).toHaveBeenCalled();
        expect(container.getContainer(sampleContainer.id)).toBeUndefined();
        expect(container.getContainerHistory(sampleContainer.id).length).toBe(
            0,
        );
    });
});
