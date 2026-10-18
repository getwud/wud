// @ts-nocheck
import Matrix from './Matrix';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    put: jest.fn().mockResolvedValue({ data: { event_id: '$event123' } }),
}));

describe('Matrix Trigger', () => {
    let matrix;

    beforeEach(async () => {
        matrix = new Matrix();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'https://matrix.example.com',
        roomid: '!myroom:example.com',
        accesstoken: 'syt_myaccesstoken_12345',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Matrix, configurationValid);

    test('should throw error when URL is missing', async () => {
        const config = {
            roomid: '!myroom:example.com',
            accesstoken: 'token',
        };
        expect(() => matrix.validateConfiguration(config)).toThrow();
    });

    test('should throw error when roomid is missing', async () => {
        const config = {
            url: 'https://matrix.example.com',
            accesstoken: 'token',
        };
        expect(() => matrix.validateConfiguration(config)).toThrow();
    });

    test('should throw error when accesstoken is missing', async () => {
        const config = {
            url: 'https://matrix.example.com',
            roomid: '!myroom:example.com',
        };
        expect(() => matrix.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data', async () => {
        matrix.configuration = {
            url: 'https://matrix.example.com',
            roomid: '!myroom:example.com',
            accesstoken: 'syt_myaccesstoken_12345',
        };
        const masked = matrix.maskConfiguration();
        expect(masked.accesstoken).toBe('s*********************5');
        expect(masked.roomid).toBe('!myroom:example.com');
        expect(masked.url).toBe('https://matrix.example.com');
    });

    test('should send message with correct endpoint, headers and payload', async () => {
        const { default: axios } = await import('axios');
        matrix.configuration = {
            url: 'https://matrix.example.com',
            roomid: '!myroom:example.com',
            accesstoken: 'syt_myaccesstoken_12345',
            disabletitle: false,
        };

        await matrix.sendMessage('Hello Matrix');
        expect(axios.put).toHaveBeenCalledWith(
            expect.stringMatching(
                /^https:\/\/matrix\.example\.com\/_matrix\/client\/v3\/rooms\/!myroom%3Aexample\.com\/send\/m\.room\.message\/wud_\d+_[a-f0-9]+$/,
            ),
            {
                msgtype: 'm.text',
                body: 'Hello Matrix',
            },
            {
                headers: {
                    Authorization: 'Bearer syt_myaccesstoken_12345',
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            },
        );
    });

    test('trigger without riskAnalysis should preserve legacy payload without formatted_body', async () => {
        const { default: axios } = await import('axios');
        matrix.configuration = {
            url: 'https://matrix.example.com',
            roomid: '!myroom:example.com',
            accesstoken: 'token123',
            simpletitle: 'Update for ${container.name}',
            simplebody:
                'From ${container.image.tag.value} to ${container.result.tag}',
        };

        const container = {
            name: 'matrix-app',
            image: { tag: { value: '1.0' } },
            result: { tag: '1.1' },
        };

        await matrix.trigger(container);
        expect(axios.put).toHaveBeenCalledWith(
            expect.any(String),
            {
                msgtype: 'm.text',
                body: 'Update for matrix-app\n\nFrom 1.0 to 1.1',
            },
            expect.any(Object),
        );
    });

    test('trigger with riskAnalysis should include HTML formatted_body with risk details', async () => {
        const { default: axios } = await import('axios');
        matrix.configuration = {
            url: 'https://matrix.example.com',
            roomid: '!myroom:example.com',
            accesstoken: 'token123',
            simpletitle: 'Update for ${container.name}',
            simplebody:
                'From ${container.image.tag.value} to ${container.result.tag}',
        };

        const container = {
            name: 'matrix-app',
            image: { tag: { value: '1.0' } },
            result: {
                tag: '2.0',
                changelogUrl:
                    'https://github.com/matrix-org/matrix-app/releases/2.0',
                riskAnalysis: {
                    riskScore: 'critical',
                    skippedVersionsCount: 3,
                    breakingChanges: ['Federation v1 dropped'],
                    databaseImpact: 'Postgres schema rewrite',
                },
            },
        };

        await matrix.trigger(container);
        expect(axios.put).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                msgtype: 'm.text',
                format: 'org.matrix.custom.html',
                formatted_body: expect.stringContaining(
                    '<font color="#e74c3c"><b>🚨 CRITICAL</b></font>',
                ),
            }),
            expect.any(Object),
        );
        const sentPayload = axios.put.mock.calls[0][1];
        expect(sentPayload.formatted_body).toContain(
            'Skipped Versions:</b> +3',
        );
        expect(sentPayload.formatted_body).toContain(
            '<li>Federation v1 dropped</li>',
        );
        expect(sentPayload.formatted_body).toContain(
            'Database Impact:</b> Postgres schema rewrite',
        );
        expect(sentPayload.formatted_body).toContain(
            '<a href="https://github.com/matrix-org/matrix-app/releases/2.0">🔍 Review Update in WUD</a>',
        );
    });
});
