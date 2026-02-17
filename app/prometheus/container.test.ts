// @ts-nocheck
jest.mock('../store/container');
jest.mock('../log');

import * as store from '../store/container';
import * as container from './container';
import log from '../log';

test('gauge must be populated when containers are in the store', async () => {
    jest.useFakeTimers();
    store.getContainers = () => [
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
    const gauge = container.init();
    const spySet = jest.spyOn(gauge, 'set');
    jest.runOnlyPendingTimers();
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
    store.getContainers = () => [
        {
            extra: 'extra',
        },
    ];
    const spyLog = jest.spyOn(log, 'warn');
    container.init();
    expect(spyLog).toHaveBeenCalled();
});
