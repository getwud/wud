// @ts-nocheck
import Zulip from './Zulip';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest
        .fn()
        .mockResolvedValue({ data: { id: 12345, result: 'success' } }),
}));

describe('Zulip Trigger', () => {
    let zulip;

    beforeEach(async () => {
        zulip = new Zulip();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'https://zulip.example.com',
        botemail: 'bot@example.com',
        apikey: 'secret_zulip_key',
        type: 'stream',
        to: 'general',
        topic: 'Updates',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Zulip, configurationValid);

    test('should throw error when URL is missing', async () => {
        const config = {
            botemail: 'bot@example.com',
            apikey: 'key',
            to: 'general',
        };
        expect(() => zulip.validateConfiguration(config)).toThrow();
    });

    test('should throw error when botemail is missing', async () => {
        const config = {
            url: 'https://zulip.example.com',
            apikey: 'key',
            to: 'general',
        };
        expect(() => zulip.validateConfiguration(config)).toThrow();
    });

    test('should throw error when apikey is missing', async () => {
        const config = {
            url: 'https://zulip.example.com',
            botemail: 'bot@example.com',
            to: 'general',
        };
        expect(() => zulip.validateConfiguration(config)).toThrow();
    });

    test('should throw error when to is missing', async () => {
        const config = {
            url: 'https://zulip.example.com',
            botemail: 'bot@example.com',
            apikey: 'key',
        };
        expect(() => zulip.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data', async () => {
        zulip.configuration = {
            url: 'https://zulip.example.com',
            botemail: 'bot@example.com',
            apikey: 'secret_zulip_key',
            type: 'stream',
            to: 'general',
        };
        const masked = zulip.maskConfiguration();
        // 'secret_zulip_key' is 16 chars: 's' + 14 stars + 'y'
        expect(masked.apikey).toBe('s**************y');
        expect(masked.botemail).toBe('bot@example.com');
        expect(masked.url).toBe('https://zulip.example.com');
    });

    test('should send stream message with correct parameters and Basic auth', async () => {
        const { default: axios } = await import('axios');
        zulip.configuration = {
            url: 'https://zulip.example.com',
            botemail: 'bot@example.com',
            apikey: 'secret_zulip_key',
            type: 'stream',
            to: 'general',
            topic: 'Updates',
        };

        await zulip.sendMessage('Update found!');

        const expectedAuth = Buffer.from(
            'bot@example.com:secret_zulip_key',
        ).toString('base64');
        expect(axios.post).toHaveBeenCalledWith(
            'https://zulip.example.com/api/v1/messages',
            'type=stream&to=general&topic=Updates&content=Update+found%21',
            {
                headers: {
                    Authorization: `Basic ${expectedAuth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    });

    test('should send direct message without topic parameter', async () => {
        const { default: axios } = await import('axios');
        zulip.configuration = {
            url: 'https://zulip.example.com',
            botemail: 'bot@example.com',
            apikey: 'secret_zulip_key',
            type: 'direct',
            to: 'user@example.com',
        };

        await zulip.sendMessage('Direct alert');

        const expectedAuth = Buffer.from(
            'bot@example.com:secret_zulip_key',
        ).toString('base64');
        expect(axios.post).toHaveBeenCalledWith(
            'https://zulip.example.com/api/v1/messages',
            'type=direct&to=user%40example.com&content=Direct+alert',
            {
                headers: {
                    Authorization: `Basic ${expectedAuth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    });
});
