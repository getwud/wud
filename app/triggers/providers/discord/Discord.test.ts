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
});
