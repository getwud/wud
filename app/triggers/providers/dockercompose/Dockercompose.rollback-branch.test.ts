import Dockercompose from './Dockercompose';
import { performProjectTransaction } from './rollback';

jest.mock('./rollback', () => ({
    performProjectTransaction: jest.fn(() => Promise.resolve()),
}));

jest.mock('fs/promises', () => ({
    access: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() =>
        Promise.resolve(
            Buffer.from('services:\n  test:\n    image: test/test:1.2.3\n'),
        ),
    ),
    writeFile: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../registry', () => ({
    getState: () => ({
        watcher: {},
        registry: {
            hub: {
                getImageFullName: (
                    image: { name: string },
                    tagOrDigest: string,
                ) => `${image.name}:${tagOrDigest}`,
            },
        },
    }),
}));

const configurationValid = {
    file: '/path/to/docker-compose.yml',
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
};

const container = {
    name: 'test',
    updateAvailable: true,
    labels: {},
    image: {
        registry: { name: 'hub' },
        name: 'test/test',
        tag: { value: '1.2.3', semver: true },
    },
    updateKind: { kind: 'tag', remoteValue: '4.5.6' },
};

describe('Dockercompose rollback branch', () => {
    let dockercompose: Dockercompose;

    beforeEach(() => {
        dockercompose = new Dockercompose();
        dockercompose.configuration = { ...configurationValid };
        (performProjectTransaction as jest.Mock).mockClear();
    });

    test('should run the project transaction when rollback is enabled', async () => {
        dockercompose.configuration = {
            ...configurationValid,
            rollback: true,
        };

        await dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);

        expect(performProjectTransaction).toHaveBeenCalledTimes(1);
        expect(performProjectTransaction).toHaveBeenCalledWith(
            dockercompose,
            '/tmp/docker-compose.yml',
            [container],
            [{ current: 'test/test:1.2.3', update: 'test/test:4.5.6' }],
        );
    });

    test('should keep the current path when rollback is disabled', async () => {
        dockercompose.performUpdate = jest.fn(() => Promise.resolve(undefined));

        await dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);

        expect(performProjectTransaction).not.toHaveBeenCalled();
    });
});
