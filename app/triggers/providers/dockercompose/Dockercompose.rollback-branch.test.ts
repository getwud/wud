import yaml from 'yaml';
import Dockercompose from './Dockercompose';
import { performProjectTransaction } from './rollback';
import { projectMutex } from './mutex';

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
            [
                {
                    current: 'test/test:1.2.3',
                    update: 'test/test:4.5.6',
                    service: 'test',
                },
            ],
        );
    });

    test('should keep the current path when rollback is disabled', async () => {
        dockercompose.performUpdate = jest.fn(() => Promise.resolve(undefined));

        await dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);

        expect(performProjectTransaction).not.toHaveBeenCalled();
    });

    test('should serialize concurrent calls to processComposeFile on the same compose file', async () => {
        projectMutex.clear();
        dockercompose.configuration = {
            ...configurationValid,
            rollback: true,
        };

        let call1Running = false;
        let call2StartedWhileCall1Running = false;

        (performProjectTransaction as jest.Mock).mockImplementationOnce(
            async () => {
                call1Running = true;
                await new Promise((resolve) => setTimeout(resolve, 50));
                call1Running = false;
                return true;
            },
        );

        (performProjectTransaction as jest.Mock).mockImplementationOnce(
            async () => {
                if (call1Running) {
                    call2StartedWhileCall1Running = true;
                }
                return true;
            },
        );

        const p1 = dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);
        const p2 = dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);

        await Promise.all([p1, p2]);

        expect(call2StartedWhileCall1Running).toBe(false);
    });

    test('should skip second transaction if first transaction already updated the compose file', async () => {
        projectMutex.clear();
        dockercompose.configuration = {
            ...configurationValid,
            rollback: true,
        };

        let fileContent = 'services:\n  test:\n    image: test/test:1.2.3\n';
        dockercompose.getComposeFileAsObject = jest
            .fn()
            .mockImplementation(async () => yaml.parse(fileContent));

        (performProjectTransaction as jest.Mock).mockImplementation(
            async () => {
                // Simulate successful transaction updating the file
                fileContent =
                    'services:\n  test:\n    image: test/test:4.5.6\n';
                return true;
            },
        );

        const p1 = dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);
        const p2 = dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);

        await Promise.all([p1, p2]);

        // performProjectTransaction should only have been called ONCE
        // because by the time call 2 acquires the lock, the compose file is already updated!
        expect(performProjectTransaction).toHaveBeenCalledTimes(1);
    });

    test('should release lock and allow subsequent transactions if first transaction rejects', async () => {
        projectMutex.clear();
        dockercompose.configuration = {
            ...configurationValid,
            rollback: true,
        };

        (performProjectTransaction as jest.Mock).mockRejectedValueOnce(
            new Error('Transaction 1 failed'),
        );
        (performProjectTransaction as jest.Mock).mockResolvedValueOnce(true);

        const p1 = dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);
        await expect(p1).rejects.toThrow('Transaction 1 failed');

        const p2 = dockercompose.processComposeFile('/tmp/docker-compose.yml', [
            container,
        ]);
        await expect(p2).resolves.not.toThrow();

        expect(performProjectTransaction).toHaveBeenCalledTimes(2);
    });
});
