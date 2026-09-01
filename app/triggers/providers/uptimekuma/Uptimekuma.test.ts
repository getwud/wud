// @ts-nocheck
import Uptimekuma from './Uptimekuma';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    get: jest
        .fn()
        .mockResolvedValue({ data: { ok: true, msg: 'Successfully pushed' } }),
}));

describe('Uptimekuma Trigger', () => {
    let uptimekuma;

    beforeEach(async () => {
        uptimekuma = new Uptimekuma();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'https://kuma.example.com/api/push/key123456789',
        status: 'up',
        msg: 'Custom OK msg',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Uptimekuma, configurationValid);

    test('should throw error when url is missing', async () => {
        const config = {
            status: 'up',
        };
        expect(() => uptimekuma.validateConfiguration(config)).toThrow();
    });

    test('should throw error when status is invalid', async () => {
        const config = {
            url: 'https://kuma.example.com/api/push/key123456789',
            status: 'degraded',
        };
        expect(() => uptimekuma.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (url)', async () => {
        uptimekuma.configuration = {
            url: 'https://kuma.example.com/api/push/key123456789',
            status: 'up',
        };
        const masked = uptimekuma.maskConfiguration();
        expect(masked.url).toBe(
            'h********************************************9',
        );
    });

    test('should send GET request to push endpoint with params', async () => {
        const { default: axios } = await import('axios');
        uptimekuma.configuration = {
            url: 'https://kuma.example.com/api/push/key123456789',
            status: 'up',
        };

        await uptimekuma.sendPush('Container nginx updated to 1.25');
        expect(axios.get).toHaveBeenCalledWith(
            'https://kuma.example.com/api/push/key123456789',
            {
                params: {
                    status: 'up',
                    msg: 'Container nginx updated to 1.25',
                },
            },
        );
    });

    test('should use custom msg if configured when triggered', async () => {
        const { default: axios } = await import('axios');
        uptimekuma.configuration = {
            url: 'https://kuma.example.com/api/push/key123456789',
            status: 'up',
            msg: 'Update Detected',
        };

        const container = { name: 'redis' };
        await uptimekuma.trigger(container);
        expect(axios.get).toHaveBeenCalledWith(
            'https://kuma.example.com/api/push/key123456789',
            {
                params: {
                    status: 'up',
                    msg: 'Update Detected',
                },
            },
        );
    });
});
