import { ValidationError } from 'joi';
import * as prometheusWatcher from '../../../prometheus/watcher';

jest.mock('../../../event');
jest.mock('../../../log');

import log from '../../../log';

import * as  storeContainer from '../../../store/container';

import { Hub } from '../../../registries/providers/hub/Hub';
import { Ecr } from '../../../registries/providers/ecr/Ecr';
import { Gcr } from '../../../registries/providers/gcr/Gcr';
import { Acr } from '../../../registries/providers/acr/Acr';

import sampleSemver from '../../samples/semver.json';
import sampleCoercedSemver from '../../samples/coercedSemver.json';
import { Container } from '../../../model/container';
import Dockerode from 'dockerode';

const hub = new Hub();
hub.kind = 'registry';
hub.type = 'hub';
hub.name = 'public';

const ecr = new Ecr();
ecr.kind = 'registry';
ecr.type = 'ecr';
ecr.name = 'private';

const gcr = new Gcr();
gcr.kind = 'registry';
gcr.type = 'gcr';
gcr.name = 'private';

const acr = new Acr();
acr.kind = 'registry';
acr.type = 'acr';
acr.name = 'private';

jest.mock('../../../registry/states', () => {
    return {
        states: {
            trigger: {},
            watcher: {},
            registry: {
                acr: acr,
                ecr: ecr,
                gcr: gcr,
                hub: hub,
            },
            authentication: {},
        },
        getState: () => { return states; },
    };
});

import { Docker, DockerConfiguration, normalizeContainer, getTagCandidates, getOldContainers, getRegistries, isContainerToWatch, isDigestToWatch, getRegistry } from './Docker';
import { states } from '../../../registry/states';

let docker: Docker;

const configurationValid = {
    socket: '/var/run/docker.sock',
    port: 2375,
    watchbydefault: true,
    watchall: false,
    watchevents: true,
    cron: '0 * * * *',
    watchatstart: true,
};

jest.mock('request-promise-native');

beforeEach(() => {
    jest.resetAllMocks();
    prometheusWatcher.init();
    docker = new Docker();
    docker.name = 'test';
    docker.configuration = configurationValid;
    docker.log = log;
    docker.log.child = () => log;
    hub.getTags = () => Promise.resolve([]);
    hub.configuration = { url: 'https://registry-1.docker.io' };
});

afterEach(() => {
    docker.deregister();
});

// Docker.__set__('getWatchContainerGauge', () => ({
//     set: () => { },
// }));

test('validatedConfiguration should initialize when configuration is valid', () => {
    const validatedConfiguration =
        docker.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validatedConfiguration should initialize with default values when not provided', () => {
    const validatedConfiguration = docker.validateConfiguration({} as DockerConfiguration);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validatedConfiguration should failed when configuration is invalid', () => {
    expect(() => {
        docker.validateConfiguration({ watchbydefault: 'xxx' } as unknown as DockerConfiguration);
    }).toThrowError(ValidationError);
});

test('initWatcher should create a configured DockerApi instance', () => {
    docker.configuration = docker.validateConfiguration(configurationValid);
    docker.initWatcher();
    expect((docker.dockerApi.modem as any).socketPath).toBe(configurationValid.socket);
});

const getTagCandidatesTestCases = [
    {
        source: sampleSemver,
        items: ['7.8.9'],
        candidates: ['7.8.9'],
    },
    {
        source: sampleCoercedSemver,
        items: ['7.8.9'],
        candidates: ['7.8.9'],
    },
    {
        source: sampleSemver,
        items: [],
        candidates: [],
    },
    {
        source: {
            ...sampleSemver,
            includeTags: '^\\d+\\.\\d+\\.\\d+$',
        },
        items: ['7.8.9'],
        candidates: ['7.8.9'],
    },
    {
        source: {
            ...sampleSemver,
            includeTags: '^v\\d+\\.\\d+\\.\\d+$',
        },
        items: ['7.8.9'],
        candidates: [],
    },
    {
        source: {
            ...sampleSemver,
            excludeTags: '^v\\d+\\.\\d+\\.\\d+$',
        },
        items: ['7.8.9'],
        candidates: ['7.8.9'],
    },
    {
        source: {
            ...sampleSemver,
            excludeTags: '\\d+\\.\\d+\\.\\d+$',
        },
        items: ['7.8.9'],
        candidates: [],
    },
    {
        source: sampleSemver,
        items: ['7.8.9', '4.5.6', '1.2.3'],
        candidates: ['7.8.9', '4.5.6'],
    },
    {
        source: sampleSemver,
        items: ['10.11.12', '7.8.9', '4.5.6', '1.2.3'],
        candidates: ['10.11.12', '7.8.9', '4.5.6'],
    },
    {
        source: {
            image: {
                tag: {
                    value: '1.9.0',
                    semver: true,
                },
            },
        },
        items: ['1.10.0', '1.2.3'],
        candidates: ['1.10.0'],
    },
];

test.each(getTagCandidatesTestCases)(
    'getTagCandidates should behave as expected',
    (item) => {
        expect(
            getTagCandidates(
                item.source as Container,
                item.items,
                docker.log,
            ),
        ).toEqual(item.candidates);
    },
);

test('normalizeContainer should return ecr when applicable', () => {
    expect(
        normalizeContainer({
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            includeTags: '^\\d+\\.\\d+.\\d+$',
            image: {
                id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
                registry: {
                    url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
                },
                name: 'test',
                tag: {
                    value: '2021.6.4',
                    semver: true,
                },
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                tag: '2021.6.5',
            },
        }).image,
    ).toStrictEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'ecr.private',
            url: 'https://123456789.dkr.ecr.eu-west-1.amazonaws.com/v2',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('normalizeContainer should return gcr when applicable', () => {
    expect(
        normalizeContainer({
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            includeTags: '^\\d+\\.\\d+.\\d+$',
            image: {
                id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
                registry: {
                    url: 'us.gcr.io',
                },
                name: 'test',
                tag: {
                    value: '2021.6.4',
                    semver: true,
                },
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                tag: '2021.6.5',
            },
        }).image,
    ).toStrictEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'gcr.private',
            url: 'https://us.gcr.io/v2',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('normalizeContainer should return acr when applicable', () => {
    expect(
        normalizeContainer({
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            includeTags: '^\\d+\\.\\d+.\\d+$',
            image: {
                id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
                registry: {
                    url: 'test.azurecr.io',
                },
                name: 'test',
                tag: {
                    value: '2021.6.4',
                    semver: true,
                },
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                tag: '2021.6.5',
            },
        }).image,
    ).toStrictEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'acr.private',
            url: 'https://test.azurecr.io/v2',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('normalizeContainer should return original container when no matching provider found', () => {
    expect(
        normalizeContainer({
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            includeTags: '^\\d+\\.\\d+.\\d+$',
            image: {
                id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
                registry: {
                    url: 'xxx',
                },
                name: 'test',
                tag: {
                    value: '2021.6.4',
                    semver: true,
                },
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                tag: '2021.6.5',
            },
        }).image,
    ).toEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'unknown',
            url: 'xxx',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('findNewVersion should return new image version when found', async () => {
    hub.getTags = () => Promise.resolve(['7.8.9']);
    hub.getImageManifestDigest = () => Promise.resolve({
        digest: 'sha256:abcdef',
        version: 2,
    });
    await expect(
        docker.findNewVersion(sampleSemver, docker.log),
    ).resolves.toMatchObject({
        tag: '7.8.9',
        digest: 'sha256:abcdef',
    });
});

test('findNewVersion should return same result as current when no image version found', async () => {
    hub.getTags = () => Promise.resolve([]);
    hub.getImageManifestDigest = () => Promise.resolve({
        digest: 'sha256:abcdef',
        version: 2,
    });
    await expect(
        docker.findNewVersion(sampleSemver, docker.log),
    ).resolves.toMatchObject({
        tag: '4.5.6',
        digest: 'sha256:abcdef',
    });
});

test('addImageDetailsToContainer should add an image definition to the container', async () => {
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    docker.dockerApi = {
        getImage: () => ({
            inspect: () => ({
                Id: 'image-123456789',
                Architecture: 'arch',
                Os: 'os',
                Size: '10',
                Created: '2021-06-12T05:33:38.440Z',
                Names: ['test'],
                RepoDigests: [
                    'test/test@sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba',
                ],
                Config: {
                    Image: 'sha256:c724d57be8bfda30b526396da9f53adb6f6ef15f7886df17b0a0bb8349f1ad79',
                },
            }),
        }),
    } as unknown as Dockerode;
    const container = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Labels: {},
    };

    const containerWithImage =
        await docker.addImageDetailsToContainer(container as Dockerode.ContainerInfo);
    expect(containerWithImage).toMatchObject({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {},
            name: 'organization/image',
            tag: {
                value: 'version',
                semver: false,
            },
            digest: {
                watch: true,
                repo: 'sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba',
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'version',
        },
    });
});

test('addImageDetailsToContainer should support transforms', async () => {
    docker.dockerApi = {
        getImage: () => ({
            inspect: () => ({
                Id: 'image-123456789',
                Architecture: 'arch',
                Os: 'os',
            }),
        }),
    } as unknown as Dockerode;
    const container = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Labels: {},
    };
    const tagTransform = '^(version)$ => $1-1.0.0';

    const containerWithImage = await docker.addImageDetailsToContainer(
        container as Dockerode.ContainerInfo,
        undefined, // tagInclude
        undefined, // tagExclude
        tagTransform,
    );
    expect(containerWithImage).toMatchObject({
        image: {
            tag: {
                value: 'version',
                semver: true,
            },
        },
        result: {
            tag: 'version',
        },
    });
});

test('watchContainer should return container report when found', async () => {
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    jest.spyOn(storeContainer, 'insertContainer').mockImplementation((container) => container);
    docker.findNewVersion = () => Promise.resolve({
        tag: '7.8.9',
    });
    hub.getTags = () => Promise.resolve(['7.8.9']);
    await expect(docker.watchContainer(sampleSemver)).resolves.toMatchObject({
        changed: true,
        container: {
            result: {
                tag: '7.8.9',
            },
        },
    });
});

test('watchContainer should return container report when no image version found', async () => {
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    jest.spyOn(storeContainer, 'insertContainer').mockImplementation((container) => container);
    docker.findNewVersion = async () => undefined;
    hub.getTags = () => Promise.resolve([]);
    await expect(docker.watchContainer(sampleSemver)).resolves.toMatchObject({
        changed: true,
        container: {
            result: undefined,
        },
    });
});

test('watchContainer should return container report with error when something bad happens', async () => {
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    jest.spyOn(storeContainer, 'insertContainer').mockImplementation((container) => container);
    docker.findNewVersion = () => {
        throw new Error('Failure!!!');
    };
    await expect(docker.watchContainer(sampleSemver)).resolves.toMatchObject({
        container: { error: { message: 'Failure!!!' } },
    });
});

test('watch should return a list of containers with changed', async () => {
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    jest.spyOn(storeContainer, 'insertContainer').mockImplementation((container) => container);

    const container1 = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Architecture: 'arch',
        Os: 'os',
        Size: '10',
        Created: '2019-05-20T12:02:06.307Z',
        Labels: {},
        RepoDigests: [
            'test/test@sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba',
        ],
        Config: {
            Image: 'sha256:c724d57be8bfda30b526396da9f53adb6f6ef15f7886df17b0a0bb8349f1ad79',
        },
    };
    docker.dockerApi = {
        listContainers: () => [container1],
        getImage: () => ({
            inspect: () => ({
                Architecture: 'arch',
                Os: 'os',
                Created: '2021-06-12T05:33:38.440Z',
                Id: 'image-123456789',
            }),
        }),
    } as unknown as Dockerode;
    await expect(docker.watch()).resolves.toMatchObject([
        {
            changed: true,
            container: {
                id: 'container-123456789',
            },
        },
    ]);
});

test('watch should log error when watching a container fails', async () => {
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    jest.spyOn(storeContainer, 'insertContainer').mockImplementation((container) => container);
    const container1 = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Architecture: 'arch',
        Os: 'os',
        Size: '10',
        Created: '2019-05-20T12:02:06.307Z',
        Labels: {},
        RepoDigests: [
            'test/test@sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba',
        ],
        Config: {
            Image: 'sha256:c724d57be8bfda30b526396da9f53adb6f6ef15f7886df17b0a0bb8349f1ad79',
        },
    };
    docker.dockerApi = {
        listContainers: () => [container1],
        getImage: () => ({
            inspect: () => ({
                Architecture: 'arch',
                Os: 'os',
                Created: '2021-06-12T05:33:38.440Z',
                Id: 'image-123456789',
            }),
        }),
    } as unknown as Dockerode;

    // Fake conf
    docker.configuration = {
        watchbydefault: true,
    } as DockerConfiguration;
    const spylog = jest.spyOn(docker.log, 'warn');
    docker.watchContainer = () => {
        throw new Error('Failure!!!');
    };
    expect(await docker.watch()).toEqual([]);
    expect(spylog).toHaveBeenCalledWith(
        'Error when processing some containers (Failure!!!)',
    );
});

test('watch should log error when an error occurs when listing containers fails', async () => {
    docker.getContainers = () => {
        throw new Error('Failure!!!');
    };
    const spylog = jest.spyOn(docker.log, 'warn');
    expect(await docker.watch()).toEqual([]);
    expect(spylog).toHaveBeenCalledWith(
        'Error when trying to get the list of the containers to watch (Failure!!!)',
    );
});

test('pruneOldContainers should prune old containers', () => {
    const oldContainers = [{ id: 1 }, { id: 2 }] as unknown as Container[];
    const newContainers = [{ id: 1 }] as unknown as Container[];
    expect(
        getOldContainers(newContainers, oldContainers),
    ).toEqual([{ id: 2 }]);
});

test('pruneOldContainers should operate when lists are empty or undefined', () => {
    expect(getOldContainers([], [])).toEqual([]);
    expect(getOldContainers(undefined, undefined)).toEqual(
        [],
    );
});

test('getRegistries should return all registered registries when called', () => {
    expect(Object.keys(getRegistries())).toEqual([
        'acr',
        'ecr',
        'gcr',
        'hub',
    ]);
});

test('getRegistry should return all registered registries when called', () => {
    expect(getRegistry('acr')).toBeDefined();
});

test('getRegistry should return all registered registries when called', () => {
    expect(() => getRegistry('registry_fail')).toThrowError(
        'Unsupported Registry registry_fail',
    );
});

test('mapContainerToContainerReport should not emit event when no update available', () => {
    const containerWithResult = {
        id: 'container-123456789',
        updateAvailable: false,
    } as Container;
    jest.spyOn(storeContainer, 'getContainer').mockReturnValue(undefined);
    jest.spyOn(storeContainer, 'insertContainer').mockImplementation((container) => container);
    expect(docker.mapContainerToContainerReport(containerWithResult)).toEqual({
        changed: true,
        container: {
            id: 'container-123456789',
            updateAvailable: false,
        },
    });
});

const containerToWatchTestCases = [
    {
        label: undefined,
        default: true,
        result: true,
    },
    {
        label: '',
        default: true,
        result: true,
    },
    {
        label: 'true',
        default: true,
        result: true,
    },
    {
        label: 'false',
        default: true,
        result: false,
    },
    {
        label: undefined,
        default: false,
        result: false,
    },
    {
        label: '',
        default: false,
        result: false,
    },
    {
        label: 'true',
        default: false,
        result: true,
    },
    {
        label: 'false',
        default: false,
        result: false,
    },
];

test.each(containerToWatchTestCases)(
    'isContainerToWatch should return $result when wud.watch label = $label and watchbydefault = $default ',
    (item) => {
        expect(isContainerToWatch(item.label!, item.default)).toEqual(
            item.result,
        );
    },
);

const digestToWatchTestCases = [
    {
        label: undefined,
        semver: false,
        result: true,
    },
    {
        label: '',
        semver: false,
        result: true,
    },
    {
        label: 'true',
        semver: false,
        result: true,
    },
    {
        label: 'false',
        semver: false,
        result: false,
    },
    {
        label: undefined,
        semver: true,
        result: false,
    },
    {
        label: '',
        semver: true,
        result: false,
    },
    {
        label: 'true',
        semver: true,
        result: true,
    },
    {
        label: 'false',
        semver: true,
        result: false,
    },
];

test.each(digestToWatchTestCases)(
    'isDigestToWatch should return $result when wud.watch label = $label and semver = semver ',
    (item) => {
        expect(isDigestToWatch(item.label!, item.semver)).toEqual(item.result);
    },
);
