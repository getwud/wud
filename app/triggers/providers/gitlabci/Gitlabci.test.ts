// @ts-nocheck
import Gitlabci from './Gitlabci';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest
        .fn()
        .mockResolvedValue({ data: { id: 12345, status: 'created' } }),
}));

describe('Gitlabci Trigger', () => {
    let gitlabci;

    beforeEach(async () => {
        gitlabci = new Gitlabci();
        jest.clearAllMocks();
    });

    const configurationValid = {
        projectid: '12345678',
        token: 'glptt-secrettrigger123456',
        ref: 'main',
        url: 'https://gitlab.example.com',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Gitlabci, configurationValid);

    test('should throw error when projectid is missing', async () => {
        const config = {
            token: 'glptt-secrettrigger123456',
        };
        expect(() => gitlabci.validateConfiguration(config)).toThrow();
    });

    test('should throw error when token is missing', async () => {
        const config = {
            projectid: '12345678',
        };
        expect(() => gitlabci.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (token)', async () => {
        gitlabci.configuration = {
            projectid: '12345678',
            token: 'glptt-secrettrigger123456',
            ref: 'main',
        };
        const masked = gitlabci.maskConfiguration();
        expect(masked.token).toBe('g***********************6');
        expect(masked.projectid).toBe('12345678');
    });

    test('should trigger pipeline with variables in simple mode', async () => {
        const { default: axios } = await import('axios');
        gitlabci.configuration = {
            projectid: '12345678',
            token: 'glptt-secrettrigger123456',
            ref: 'main',
            url: 'https://gitlab.example.com',
        };

        const container = {
            name: 'frontend',
            watcher: 'local',
            image: { name: 'nginx' },
            updateKind: { localValue: '1.24', remoteValue: '1.25' },
            result: { link: 'https://hub.docker.com' },
        };

        gitlabci.renderSimpleTitle = jest.fn().mockReturnValue('Nginx Update');
        gitlabci.renderSimpleBody = jest.fn().mockReturnValue('Update ready');

        await gitlabci.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://gitlab.example.com/api/v4/projects/12345678/trigger/pipeline',
            {
                token: 'glptt-secrettrigger123456',
                ref: 'main',
                variables: {
                    WUD_MODE: 'simple',
                    WUD_CONTAINER: 'frontend',
                    WUD_WATCHER: 'local',
                    WUD_IMAGE: 'nginx',
                    WUD_LOCAL_TAG: '1.24',
                    WUD_REMOTE_TAG: '1.25',
                    WUD_LINK: 'https://hub.docker.com',
                    WUD_TITLE: 'Nginx Update',
                    WUD_MESSAGE: 'Update ready',
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('should trigger pipeline with variables in batch mode', async () => {
        const { default: axios } = await import('axios');
        gitlabci.configuration = {
            projectid: 'group/subgroup/project',
            token: 'glptt-secrettrigger123456',
            ref: 'release',
            url: 'https://gitlab.com',
        };

        const containers = [{ name: 'nginx' }, { name: 'redis' }];
        gitlabci.renderBatchTitle = jest.fn().mockReturnValue('2 Updates');
        gitlabci.renderBatchBody = jest.fn().mockReturnValue('nginx, redis');

        await gitlabci.triggerBatch(containers);
        expect(axios.post).toHaveBeenCalledWith(
            'https://gitlab.com/api/v4/projects/group%2Fsubgroup%2Fproject/trigger/pipeline',
            {
                token: 'glptt-secrettrigger123456',
                ref: 'release',
                variables: {
                    WUD_MODE: 'batch',
                    WUD_COUNT: '2',
                    WUD_CONTAINERS: 'nginx,redis',
                    WUD_TITLE: '2 Updates',
                    WUD_MESSAGE: 'nginx, redis',
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
