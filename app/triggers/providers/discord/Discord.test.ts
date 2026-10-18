import Discord from './Discord';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => jest.fn().mockResolvedValue({ data: {} }));

const validConfiguration = {
    url: 'https://discord.com/api/webhooks/123/abc',
};

describe('Discord Trigger', () => {
    testTriggerProvider(Discord, validConfiguration);

    let discord;

    beforeEach(async () => {
        discord = new Discord();
        jest.clearAllMocks();
    });

    test('should throw error when webhook URL is missing', async () => {
        const config = {};
        expect(() => discord.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration URL', async () => {
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/secret',
        };
        const masked = discord.maskConfiguration();
        expect(masked.url).toBe('h*****************************************t');
    });

    test('should send message with custom configuration', async () => {
        const { default: axios } = await import('axios');
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/abc',
            botusername: 'CustomBot',
            cardcolor: 16711680,
            cardlabel: 'Updates',
        };

        await discord.sendMessage('Test Title', 'Test Body');
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://discord.com/api/webhooks/123/abc',
            data: {
                username: 'CustomBot',
                embeds: [
                    {
                        title: 'Test Title',
                        color: 16711680,
                        fields: [
                            {
                                name: 'Updates',
                                value: 'Test Body',
                            },
                        ],
                    },
                ],
            },
        });
    });

    test('should validate configuration with avatar URL', async () => {
        const config = {
            url: 'https://discord.com/api/webhooks/123/abc',
            avatarurl: 'https://example.com/avatar.png',
        };

        expect(() => discord.validateConfiguration(config)).not.toThrow();
    });

    test('should validate configuration with empty avatar URL', async () => {
        const config = {
            url: 'https://discord.com/api/webhooks/123/abc',
            avatarurl: '',
        };

        expect(() => discord.validateConfiguration(config)).not.toThrow();
    });

    test('should validate configuration with no avatar URL', async () => {
        const config = {
            url: 'https://discord.com/api/webhooks/123/abc',
        };

        expect(() => discord.validateConfiguration(config)).not.toThrow();
    });

    test('should apply default avatar URL when not set', async () => {
        const config = {
            url: 'https://discord.com/api/webhooks/123/abc',
        };

        const validated = discord.validateConfiguration(config);
        expect(validated.avatarurl).toBe('');
    });

    test('should reject invalid avatar URL (not HTTPS)', async () => {
        const config = {
            url: 'https://discord.com/api/webhooks/123/abc',
            avatarurl: 'http://example.com/avatar.png',
        };

        expect(() => discord.validateConfiguration(config)).toThrow();
    });

    test('should send message with avatar URL', async () => {
        const { default: axios } = await import('axios');
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/abc',
            avatarurl:
                'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/whats-up-docker.png',
        };

        await discord.sendMessage('Test Title', 'Test Body');
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://discord.com/api/webhooks/123/abc',
            data: {
                avatar_url:
                    'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/whats-up-docker.png',
                embeds: [
                    {
                        title: 'Test Title',
                        fields: [
                            {
                                value: 'Test Body',
                            },
                        ],
                    },
                ],
            },
        });
    });

    test('should send message with empty avatar URL by default', async () => {
        const { default: axios } = await import('axios');
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/abc',
            avatarurl: '',
        };

        await discord.sendMessage('Test Title', 'Test Body');
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://discord.com/api/webhooks/123/abc',
            data: {
                avatar_url: '',
                embeds: [
                    {
                        title: 'Test Title',
                        fields: [
                            {
                                value: 'Test Body',
                            },
                        ],
                    },
                ],
            },
        });
    });

    test('should send message without avatar URL in configuration', async () => {
        const { default: axios } = await import('axios');
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/abc',
        };

        await discord.sendMessage('Test Title', 'Test Body');
        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://discord.com/api/webhooks/123/abc',
            data: {
                embeds: [
                    {
                        title: 'Test Title',
                        fields: [
                            {
                                value: 'Test Body',
                            },
                        ],
                    },
                ],
            },
        });
    });

    test('trigger should enrich embed with risk score color and extra fields when riskAnalysis is present', async () => {
        const { default: axios } = await import('axios');
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/abc',
            botusername: 'WUD',
            cardcolor: 65280,
            cardlabel: 'Update Available',
            simpletitle: 'Update for ${container.name}',
            simplebody:
                'From ${container.updateKind.localValue} to ${container.updateKind.remoteValue}',
        };

        const container = {
            name: 'redis-server',
            updateKind: { localValue: '7.0.15', remoteValue: '7.2.4' },
            changelogUrl: 'https://github.com/redis/redis/releases/tag/7.2.4',
            result: {
                tag: '7.2.4',
                riskAnalysis: {
                    imageRef: 'redis',
                    currentTag: '7.0.15',
                    targetTag: '7.2.4',
                    riskScore: 'critical',
                    summary: 'Persistence changes & DB format migration',
                    skippedVersionsCount: 2,
                    breakingChanges: ['Breaking snapshot layout'],
                    databaseImpact: 'Automatic DB format conversion on startup',
                },
            },
        };

        await discord.trigger(container);

        expect(axios).toHaveBeenCalledWith({
            method: 'POST',
            url: 'https://discord.com/api/webhooks/123/abc',
            data: {
                username: 'WUD',
                embeds: [
                    {
                        title: 'Update for redis-server',
                        color: 15158332, // #e74c3c (critical)
                        fields: [
                            {
                                name: 'Update Available',
                                value: 'From 7.0.15 to 7.2.4',
                            },
                            { name: 'Risk Level', value: '🚨 CRITICAL' },
                            {
                                name: 'Skipped Versions',
                                value: '+2 versions (7.0.15 ➔ 7.2.4)',
                            },
                            {
                                name: 'Summary',
                                value: 'Persistence changes & DB format migration',
                            },
                            {
                                name: 'Breaking Changes',
                                value: '• Breaking snapshot layout',
                            },
                            {
                                name: 'DB / Storage Impact',
                                value: 'Automatic DB format conversion on startup',
                            },
                            {
                                name: 'Release Notes',
                                value: 'https://github.com/redis/redis/releases/tag/7.2.4',
                            },
                            {
                                name: 'Link',
                                value: '[ 🔍 Review Update in WUD ](https://github.com/redis/redis/releases/tag/7.2.4)',
                            },
                        ],
                    },
                ],
            },
        });
    });

    test('trigger should use proper embed colors for low, medium, and high risk scores', async () => {
        const { default: axios } = await import('axios');
        discord.configuration = {
            url: 'https://discord.com/api/webhooks/123/abc',
        };

        const createContainer = (score) => ({
            name: 'test',
            updateKind: { localValue: '1.0.0', remoteValue: '1.1.0' },
            result: {
                tag: '1.1.0',
                riskAnalysis: {
                    imageRef: 'test',
                    currentTag: '1.0.0',
                    targetTag: '1.1.0',
                    riskScore: score,
                    breakingChanges: [],
                },
            },
        });

        // Low risk -> #2eb886 (3061894)
        await discord.trigger(createContainer('low'));
        expect(axios).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    embeds: [expect.objectContaining({ color: 3061894 })],
                }),
            }),
        );

        // Medium risk -> #e67e22 (15105570)
        await discord.trigger(createContainer('medium'));
        expect(axios).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    embeds: [expect.objectContaining({ color: 15105570 })],
                }),
            }),
        );

        // High risk -> #e74c3c (15158332)
        await discord.trigger(createContainer('high'));
        expect(axios).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    embeds: [expect.objectContaining({ color: 15158332 })],
                }),
            }),
        );
    });
});
