// @ts-nocheck
import Rocketchat from './Rocketchat';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: {} }),
}));

describe('Rocketchat Trigger', () => {
    let rocketchat;

    beforeEach(async () => {
        rocketchat = new Rocketchat();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'https://open.rocket.chat',
        user: { id: 'jDdn8oh9BfJKnWdDY' },
        auth: { token: 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx' },
        channel: '#general',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Rocketchat, configurationValid);

    test('should throw error when URL is missing', async () => {
        const config = {
            user: { id: 'test' },
            auth: { token: 'test' },
            channel: '#general',
        };

        expect(() => rocketchat.validateConfiguration(config)).toThrow();
    });

    test('should throw error when user id is missing', async () => {
        const config = {
            url: 'https://open.rocket.chat',
            user: {},
            auth: { token: 'test' },
            channel: '#general',
        };

        expect(() => rocketchat.validateConfiguration(config)).toThrow();
    });

    test('should throw error when auth token is missing', async () => {
        const config = {
            url: 'https://open.rocket.chat',
            user: { id: 'test' },
            auth: {},
            channel: '#general',
        };

        expect(() => rocketchat.validateConfiguration(config)).toThrow();
    });

    test('should throw error when channel is missing', async () => {
        const config = {
            url: 'https://open.rocket.chat',
            user: { id: 'test' },
            auth: { token: 'test' },
        };

        expect(() => rocketchat.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data', async () => {
        rocketchat.configuration = {
            auth: { token: 'token' },
            user: { id: 'some_user_id' },
            channel: '#general',
        };
        const masked = rocketchat.maskConfiguration();
        expect(masked.auth.token).toBe('t***n');
        expect(masked.user.id).toBe('s**********d');
        expect(masked.channel).toBe('#general');
    });

    // boilerplate tests removed in favor of testTriggerProvider

    test('should send message with correct data', async () => {
        const { default: axios } = await import('axios');
        rocketchat.configuration = {
            url: 'https://open.rocket.chat',
            user: { id: 'jDdn8oh9BfJKnWdDY' },
            auth: { token: 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx' },
            channel: '#general',
        };

        await rocketchat.postMessage('Test message');
        expect(axios.post).toHaveBeenCalledWith(
            'https://open.rocket.chat/api/v1/chat.postMessage',
            {
                channel: '#general',
                text: 'Test message',
            },
            {
                headers: {
                    'X-Auth-Token':
                        'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx',
                    'X-User-Id': 'jDdn8oh9BfJKnWdDY',
                    'content-type': 'application/json',
                    accept: 'application/json',
                },
            },
        );
    });
});
