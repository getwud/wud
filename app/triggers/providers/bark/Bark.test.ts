// @ts-nocheck
import Bark from './Bark';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest
        .fn()
        .mockResolvedValue({ data: { code: 200, message: 'success' } }),
}));

describe('Bark Trigger', () => {
    let bark;

    beforeEach(async () => {
        bark = new Bark();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'https://api.day.app',
        devicekey: 'my_bark_device_key',
        group: 'WUD-Alerts',
        icon: 'https://example.com/icon.png',
        sound: 'alarm',
        badge: 1,
        urltoopen: 'https://example.com',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Bark, configurationValid);

    test('should throw error when devicekey is missing', async () => {
        const config = {
            url: 'https://api.day.app',
        };
        expect(() => bark.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (devicekey)', async () => {
        bark.configuration = {
            url: 'https://api.day.app',
            devicekey: 'my_bark_device_key',
            group: 'WUD',
        };
        const masked = bark.maskConfiguration();
        // 'my_bark_device_key' is 18 chars: 'm' + 16 stars + 'y'
        expect(masked.devicekey).toBe('m****************y');
        expect(masked.group).toBe('WUD');
        expect(masked.url).toBe('https://api.day.app');
    });

    test('should send push notification with correct payload', async () => {
        const { default: axios } = await import('axios');
        bark.configuration = {
            url: 'https://api.day.app',
            devicekey: 'my_bark_device_key',
            group: 'WUD',
            icon: 'https://example.com/icon.png',
            sound: 'minuet',
            badge: 2,
            urltoopen: 'https://hub.docker.com',
        };

        await bark.sendMessage(
            'Update Title',
            'Update Body',
            'https://fallback.com',
        );
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.day.app/push',
            {
                device_key: 'my_bark_device_key',
                title: 'Update Title',
                body: 'Update Body',
                group: 'WUD',
                icon: 'https://example.com/icon.png',
                sound: 'minuet',
                badge: 2,
                url: 'https://hub.docker.com',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('should fallback to container link when urltoopen is not configured', async () => {
        const { default: axios } = await import('axios');
        bark.configuration = {
            url: 'https://api.day.app',
            devicekey: 'my_bark_device_key',
            group: 'WUD',
        };

        await bark.sendMessage(
            'Update Title',
            'Update Body',
            'https://fallback.com',
        );
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.day.app/push',
            {
                device_key: 'my_bark_device_key',
                title: 'Update Title',
                body: 'Update Body',
                group: 'WUD',
                url: 'https://fallback.com',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
