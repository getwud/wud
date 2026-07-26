// @ts-nocheck
jest.mock('../store/container');
jest.mock('../log');
jest.mock('../event', () => ({
    registerContainerAdded: jest.fn(),
    registerContainerUpdated: jest.fn(),
    registerContainerRemoved: jest.fn(),
}));

import * as store from '../store/container';
import * as event from '../event';
import * as container from './container';
import log from '../log';

const sampleContainers = [
    {
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'registry',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: 'version',
                semver: false,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'version',
        },
    },
];

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    store.getContainers = jest.fn(() => sampleContainers);
});

afterEach(() => {
    jest.useRealTimers();
});

test('gauge must be populated on init when containers are in the store', async () => {
    let onAdded;
    event.registerContainerAdded.mockImplementation((handler) => {
        onAdded = handler;
        return jest.fn();
    });
    event.registerContainerUpdated.mockImplementation(() => jest.fn());
    event.registerContainerRemoved.mockImplementation(() => jest.fn());

    const gauge = container.init();
    const spySet = jest.spyOn(gauge, 'set');
    spySet.mockClear();

    onAdded(sampleContainers[0]);
    jest.advanceTimersByTime(5000);

    expect(spySet).toHaveBeenCalledWith(
        {
            id: 'container-123456789',
            image_architecture: 'arch',
            image_created: '2021-06-12T05:33:38.440Z',
            image_digest_repo: undefined,
            image_digest_watch: false,
            image_id: 'image-123456789',
            image_name: 'organization/image',
            image_os: 'os',
            image_registry_name: 'registry',
            image_registry_url: 'https://hub',
            image_tag_semver: false,
            image_tag_value: 'version',
            name: 'test',
            result_tag: 'version',
            watcher: 'test',
        },
        1,
    );
});

test("gauge must warn when data don't match expected labels", async () => {
    event.registerContainerAdded.mockImplementation(() => jest.fn());
    event.registerContainerUpdated.mockImplementation(() => jest.fn());
    event.registerContainerRemoved.mockImplementation(() => jest.fn());
    store.getContainers = jest.fn(() => [
        {
            extra: 'extra',
        },
    ]);
    const spyLog = jest.spyOn(log, 'warn');
    container.init();
    expect(spyLog).toHaveBeenCalled();
});

test('interval tick should skip full rebuild when metrics are clean', async () => {
    event.registerContainerAdded.mockImplementation(() => jest.fn());
    event.registerContainerUpdated.mockImplementation(() => jest.fn());
    event.registerContainerRemoved.mockImplementation(() => jest.fn());

    const gauge = container.init();
    const spyReset = jest.spyOn(gauge, 'reset');
    const spySet = jest.spyOn(gauge, 'set');

    spyReset.mockClear();
    spySet.mockClear();
    jest.advanceTimersByTime(5000);

    expect(spyReset).not.toHaveBeenCalled();
    expect(spySet).not.toHaveBeenCalled();
});

test('container event should mark metrics dirty and rebuild on next interval', async () => {
    let onAdded;
    event.registerContainerAdded.mockImplementation((handler) => {
        onAdded = handler;
        return jest.fn();
    });
    event.registerContainerUpdated.mockImplementation(() => jest.fn());
    event.registerContainerRemoved.mockImplementation(() => jest.fn());

    const gauge = container.init();
    const spySet = jest.spyOn(gauge, 'set');
    spySet.mockClear();

    onAdded(sampleContainers[0]);
    jest.advanceTimersByTime(5000);

    expect(spySet).toHaveBeenCalledTimes(1);
});
