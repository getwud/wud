// @ts-nocheck
import Githubactions from './Githubactions';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ status: 204 }),
}));

describe('Githubactions Trigger', () => {
    let githubactions;

    beforeEach(async () => {
        githubactions = new Githubactions();
        jest.clearAllMocks();
    });

    const configurationValid = {
        owner: 'myorg',
        repo: 'myrepo',
        token: 'ghp_secrettoken1234567890',
        eventtype: 'container-update',
        url: 'https://api.github.com',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Githubactions, configurationValid);

    test('should throw error when owner is missing', async () => {
        const config = {
            repo: 'myrepo',
            token: 'ghp_secret',
        };
        expect(() => githubactions.validateConfiguration(config)).toThrow();
    });

    test('should throw error when repo is missing', async () => {
        const config = {
            owner: 'myorg',
            token: 'ghp_secret',
        };
        expect(() => githubactions.validateConfiguration(config)).toThrow();
    });

    test('should throw error when token is missing', async () => {
        const config = {
            owner: 'myorg',
            repo: 'myrepo',
        };
        expect(() => githubactions.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (token)', async () => {
        githubactions.configuration = {
            owner: 'myorg',
            repo: 'myrepo',
            token: 'ghp_secrettoken1234567890',
        };
        const masked = githubactions.maskConfiguration();
        // 25 chars: 'g' + 23 stars + '0'
        expect(masked.token).toBe('g***********************0');
        expect(masked.owner).toBe('myorg');
        expect(masked.repo).toBe('myrepo');
    });

    test('should send repository_dispatch event with correct headers and payload in simple mode', async () => {
        const { default: axios } = await import('axios');
        githubactions.configuration = {
            owner: 'myorg',
            repo: 'myrepo',
            token: 'ghp_secrettoken1234567890',
            eventtype: 'wud-update',
            url: 'https://api.github.com',
        };

        const container = {
            name: 'frontend',
            watcher: 'local',
            image: { name: 'nginx' },
            updateKind: { localValue: '1.24', remoteValue: '1.25' },
            result: { link: 'https://hub.docker.com' },
        };

        githubactions.renderSimpleTitle = jest
            .fn()
            .mockReturnValue('Nginx Update');
        githubactions.renderSimpleBody = jest
            .fn()
            .mockReturnValue('Update ready');

        await githubactions.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.github.com/repos/myorg/myrepo/dispatches',
            {
                event_type: 'wud-update',
                client_payload: {
                    title: 'Nginx Update',
                    message: 'Update ready',
                    mode: 'simple',
                    container: 'frontend',
                    watcher: 'local',
                    image: 'nginx',
                    localTag: '1.24',
                    remoteTag: '1.25',
                    link: 'https://hub.docker.com',
                    raw: container,
                },
            },
            {
                headers: {
                    Authorization: 'Bearer ghp_secrettoken1234567890',
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('should send repository_dispatch event with correct payload in batch mode', async () => {
        const { default: axios } = await import('axios');
        githubactions.configuration = {
            owner: 'myorg',
            repo: 'myrepo',
            token: 'ghp_secrettoken1234567890',
            eventtype: 'wud-update',
            url: 'https://api.github.com',
        };

        const containers = [
            {
                name: 'web',
                watcher: 'local',
                image: { name: 'nginx' },
                updateKind: { localValue: '1.0', remoteValue: '1.1' },
            },
        ];

        githubactions.renderBatchTitle = jest.fn().mockReturnValue('1 Update');
        githubactions.renderBatchBody = jest
            .fn()
            .mockReturnValue('web updated');

        await githubactions.triggerBatch(containers);
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.github.com/repos/myorg/myrepo/dispatches',
            {
                event_type: 'wud-update',
                client_payload: {
                    title: '1 Update',
                    message: 'web updated',
                    mode: 'batch',
                    count: 1,
                    containers: [
                        {
                            container: 'web',
                            watcher: 'local',
                            image: 'nginx',
                            localTag: '1.0',
                            remoteTag: '1.1',
                        },
                    ],
                },
            },
            {
                headers: {
                    Authorization: 'Bearer ghp_secrettoken1234567890',
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
