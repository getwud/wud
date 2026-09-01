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
});
