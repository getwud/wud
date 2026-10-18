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

    test('trigger without riskAnalysis should preserve legacy payload without attachments', async () => {
        const { default: axios } = await import('axios');
        rocketchat.configuration = {
            url: 'https://open.rocket.chat',
            user: { id: 'user123' },
            auth: { token: 'token123' },
            channel: '#general',
            simpletitle: 'Update for ${container.name}',
            simplebody:
                'From ${container.image.tag.value} to ${container.result.tag}',
        };

        const container = {
            name: 'rocketchat-app',
            image: { tag: { value: '1.0' } },
            result: { tag: '2.0' },
        };

        await rocketchat.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://open.rocket.chat/api/v1/chat.postMessage',
            {
                channel: '#general',
                text: 'Update for rocketchat-app\n\nFrom 1.0 to 2.0',
            },
            expect.any(Object),
        );
    });

    test('trigger with riskAnalysis should include color attachment and fields', async () => {
        const { default: axios } = await import('axios');
        rocketchat.configuration = {
            url: 'https://open.rocket.chat',
            user: { id: 'user123' },
            auth: { token: 'token123' },
            channel: '#general',
            simpletitle: 'Update for ${container.name}',
            simplebody:
                'From ${container.image.tag.value} to ${container.result.tag}',
        };

        const container = {
            name: 'rocketchat-app',
            image: { tag: { value: '1.0' } },
            result: {
                tag: '2.0',
                changelogUrl: 'https://rocket.chat/release/2.0',
                riskAnalysis: {
                    riskScore: 'medium',
                    skippedVersionsCount: 1,
                    breakingChanges: ['Deprecated REST endpoint removed'],
                    databaseImpact: 'MongoDB 5.0 migration needed',
                },
            },
        };

        await rocketchat.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://open.rocket.chat/api/v1/chat.postMessage',
            {
                channel: '#general',
                text: 'Update for rocketchat-app\n\nFrom 1.0 to 2.0',
                attachments: [
                    {
                        color: '#e67e22',
                        fields: [
                            {
                                title: 'Risk Level',
                                value: '⚠️ MEDIUM',
                                short: true,
                            },
                            {
                                title: 'Skipped Versions',
                                value: '+1',
                                short: true,
                            },
                            {
                                title: 'Breaking Changes',
                                value: '• Deprecated REST endpoint removed',
                                short: false,
                            },
                            {
                                title: 'DB Impact',
                                value: 'MongoDB 5.0 migration needed',
                                short: false,
                            },
                            {
                                title: 'Review',
                                value: '[Review Update in WUD](https://rocket.chat/release/2.0)',
                                short: false,
                            },
                        ],
                    },
                ],
            },
            expect.any(Object),
        );
    });
});
