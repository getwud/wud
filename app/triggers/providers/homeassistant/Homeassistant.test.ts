// @ts-nocheck
import Homeassistant from './Homeassistant';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: { message: 'success' } }),
}));

describe('Homeassistant Trigger', () => {
    let homeassistant;

    beforeEach(async () => {
        homeassistant = new Homeassistant();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'http://homeassistant.local:8123/api/webhook/secret_hook_123',
        event: 'docker_update',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Homeassistant, configurationValid);

    test('should throw error when url is missing', async () => {
        const config = {
            event: 'update',
        };
        expect(() => homeassistant.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (url)', async () => {
        homeassistant.configuration = {
            url: 'http://homeassistant.local:8123/api/webhook/secret_hook_123',
            event: 'docker_update',
        };
        const masked = homeassistant.maskConfiguration();
        expect(masked.url).toBe(
            'h*********************************************************3',
        );
        expect(masked.event).toBe('docker_update');
    });

    test('should send webhook payload in simple mode', async () => {
        const { default: axios } = await import('axios');
        homeassistant.configuration = {
            url: 'http://homeassistant.local:8123/api/webhook/secret_hook_123',
            event: 'docker_update',
            disabletitle: false,
        };

        const container = { name: 'nginx', id: '12345' };
        homeassistant.renderSimpleTitle = jest
            .fn()
            .mockReturnValue('Nginx Update');
        homeassistant.renderSimpleBody = jest
            .fn()
            .mockReturnValue('Update to 1.25');

        await homeassistant.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'http://homeassistant.local:8123/api/webhook/secret_hook_123',
            {
                event: 'docker_update',
                mode: 'simple',
                title: 'Nginx Update',
                message: 'Update to 1.25',
                container,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('should send webhook payload in batch mode', async () => {
        const { default: axios } = await import('axios');
        homeassistant.configuration = {
            url: 'http://homeassistant.local:8123/api/webhook/secret_hook_123',
            event: 'docker_update',
            disabletitle: false,
        };

        const containers = [{ name: 'nginx' }, { name: 'redis' }];
        homeassistant.renderBatchTitle = jest.fn().mockReturnValue('2 Updates');
        homeassistant.renderBatchBody = jest
            .fn()
            .mockReturnValue('nginx and redis');

        await homeassistant.triggerBatch(containers);
        expect(axios.post).toHaveBeenCalledWith(
            'http://homeassistant.local:8123/api/webhook/secret_hook_123',
            {
                event: 'docker_update',
                mode: 'batch',
                title: '2 Updates',
                message: 'nginx and redis',
                count: 2,
                containers,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
