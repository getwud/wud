// @ts-nocheck
import Rocketchat from './Rocketchat';

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

    test('should create instance', async () => {
        expect(rocketchat).toBeDefined();
        expect(rocketchat).toBeInstanceOf(Rocketchat);
    });

    test('should have correct configuration schema', async () => {
        const schema = rocketchat.getConfigurationSchema();
        expect(schema).toBeDefined();
    });

    test('should validate configuration with required fields', async () => {
        const config = {
            url: 'https://open.rocket.chat',
            user: { id: 'jDdn8oh9BfJKnWdDY' },
            auth: { token: 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx' },
            channel: '#general',
        };

        expect(() => rocketchat.validateConfiguration(config)).not.toThrow();
    });

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

    test('should trigger with container', async () => {
        const { default: axios } = await import('axios');
        rocketchat.configuration = {
            url: 'https://open.rocket.chat',
            user: { id: 'jDdn8oh9BfJKnWdDY' },
            auth: { token: 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx' },
            channel: '#general',
        };
        rocketchat.renderSimpleTitle = jest.fn().mockReturnValue('Title');
        rocketchat.renderSimpleBody = jest.fn().mockReturnValue('Body');
        const container = { name: 'test' };

        await rocketchat.trigger(container);
        expect(rocketchat.renderSimpleTitle).toHaveBeenCalledWith(container);
        expect(rocketchat.renderSimpleBody).toHaveBeenCalledWith(container);
    });

    test('should trigger batch with containers', async () => {
        const { default: axios } = await import('axios');
        rocketchat.configuration = {
            url: 'https://open.rocket.chat',
            user: { id: 'jDdn8oh9BfJKnWdDY' },
            auth: { token: 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx' },
            channel: '#general',
        };
        rocketchat.renderBatchTitle = jest.fn().mockReturnValue('Batch Title');
        rocketchat.renderBatchBody = jest.fn().mockReturnValue('Batch Body');
        const containers = [{ name: 'test1' }, { name: 'test2' }];

        await rocketchat.triggerBatch(containers);
        expect(rocketchat.renderBatchTitle).toHaveBeenCalledWith(containers);
        expect(rocketchat.renderBatchBody).toHaveBeenCalledWith(containers);
    });

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
