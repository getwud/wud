// @ts-nocheck
import Mattermost from './Mattermost';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: {} }),
}));

describe('Mattermost Trigger', () => {
    let mattermost;

    beforeEach(async () => {
        mattermost = new Mattermost();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'https://mattermost.example.com/hooks/xyz123',
        channel: 'devops',
        username: 'WUD-Bot',
        iconurl: 'https://example.com/icon.png',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Mattermost, configurationValid);

    test('should throw error when URL is missing', async () => {
        const config = {
            channel: 'devops',
        };
        expect(() => mattermost.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (url)', async () => {
        mattermost.configuration = {
            url: 'https://mattermost.example.com/hooks/xyz123',
            channel: 'devops',
        };
        const masked = mattermost.maskConfiguration();
        expect(masked.url).toBe('h*****************************************3');
        expect(masked.channel).toBe('devops');
    });

    test('should send message to webhook with correct payload', async () => {
        const { default: axios } = await import('axios');
        mattermost.configuration = {
            url: 'https://mattermost.example.com/hooks/xyz123',
            channel: 'devops',
            username: 'WUD-Bot',
            iconurl: 'https://example.com/icon.png',
        };

        await mattermost.sendMessage('Test notification');
        expect(axios.post).toHaveBeenCalledWith(
            'https://mattermost.example.com/hooks/xyz123',
            {
                text: 'Test notification',
                channel: 'devops',
                username: 'WUD-Bot',
                icon_url: 'https://example.com/icon.png',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('trigger without riskAnalysis should preserve legacy payload without attachments', async () => {
        const { default: axios } = await import('axios');
        mattermost.configuration = {
            url: 'https://mattermost.example.com/hooks/xyz123',
            simpletitle: 'New version for ${container.name}',
            simplebody:
                'Update from ${container.image.tag.value} to ${container.result.tag}',
        };

        const container = {
            id: 'c1',
            name: 'redis-server',
            image: { tag: { value: '7.0.0' } },
            result: { tag: '7.2.0' },
        };

        await mattermost.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://mattermost.example.com/hooks/xyz123',
            {
                text: '### New version for redis-server\nUpdate from 7.0.0 to 7.2.0',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('trigger with riskAnalysis should include color-coded attachment and fields', async () => {
        const { default: axios } = await import('axios');
        mattermost.configuration = {
            url: 'https://mattermost.example.com/hooks/xyz123',
            simpletitle: 'New version for ${container.name}',
            simplebody:
                'Update from ${container.image.tag.value} to ${container.result.tag}',
        };

        const container = {
            id: 'c1',
            name: 'redis-server',
            image: { tag: { value: '7.0.0' } },
            result: {
                tag: '7.2.0',
                changelogUrl: 'https://github.com/redis/redis/releases/v7.2.0',
                riskAnalysis: {
                    riskScore: 'high',
                    skippedVersionsCount: 2,
                    breakingChanges: ['Deprecated sentinel commands removed'],
                    databaseImpact: 'RDB persistence format upgrade',
                },
            },
        };

        await mattermost.trigger(container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://mattermost.example.com/hooks/xyz123',
            {
                text: '### New version for redis-server\nUpdate from 7.0.0 to 7.2.0',
                attachments: [
                    {
                        color: '#e74c3c',
                        fields: [
                            {
                                title: 'Risk Level',
                                value: '⚡ HIGH',
                                short: true,
                            },
                            {
                                title: 'Skipped Releases',
                                value: '+2 versions',
                                short: true,
                            },
                            {
                                title: 'Breaking Changes',
                                value: '• Deprecated sentinel commands removed',
                                short: false,
                            },
                            {
                                title: 'Database Impact',
                                value: 'RDB persistence format upgrade',
                                short: false,
                            },
                            {
                                title: 'Review',
                                value: '[Review Update in WUD](https://github.com/redis/redis/releases/v7.2.0)',
                                short: false,
                            },
                        ],
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
