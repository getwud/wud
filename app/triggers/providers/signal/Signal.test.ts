// @ts-nocheck
import Signal from './Signal';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: { timestamp: 123456789 } }),
}));

describe('Signal Trigger', () => {
    let signal;

    beforeEach(async () => {
        signal = new Signal();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'http://signal-cli:8080',
        number: '+1234567890',
        recipients: '+1987654321, +1122334455',
        apikey: 'secret_signal_token',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Signal, configurationValid);

    test('should throw error when URL is missing', async () => {
        const config = {
            number: '+1234567890',
            recipients: '+1987654321',
        };
        expect(() => signal.validateConfiguration(config)).toThrow();
    });

    test('should throw error when number is missing', async () => {
        const config = {
            url: 'http://signal-cli:8080',
            recipients: '+1987654321',
        };
        expect(() => signal.validateConfiguration(config)).toThrow();
    });

    test('should throw error when recipients is missing', async () => {
        const config = {
            url: 'http://signal-cli:8080',
            number: '+1234567890',
        };
        expect(() => signal.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data', async () => {
        signal.configuration = {
            url: 'http://signal-cli:8080',
            number: '+1234567890',
            recipients: '+1987654321',
            apikey: 'secret_signal_token',
        };
        const masked = signal.maskConfiguration();
        // '+1234567890' is 11 chars: '+' + 9 stars + '0'
        expect(masked.number).toBe('+*********0');
        // '+1987654321' is 11 chars: '+' + 9 stars + '1'
        expect(masked.recipients).toBe('+*********1');
        // 'secret_signal_token' is 19 chars: 's' + 17 stars + 'n'
        expect(masked.apikey).toBe('s*****************n');
    });

    test('should send message to /v2/send with Authorization header and split recipients', async () => {
        const { default: axios } = await import('axios');
        signal.configuration = {
            url: 'http://signal-cli:8080',
            number: '+1234567890',
            recipients: '+1987654321, +1122334455',
            apikey: 'secret_signal_token',
        };

        await signal.sendMessage('New image available');
        expect(axios.post).toHaveBeenCalledWith(
            'http://signal-cli:8080/v2/send',
            {
                message: 'New image available',
                number: '+1234567890',
                recipients: ['+1987654321', '+1122334455'],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer secret_signal_token',
                },
            },
        );
    });

    test('should send message without Authorization header when apikey is not set', async () => {
        const { default: axios } = await import('axios');
        signal.configuration = {
            url: 'http://signal-cli:8080',
            number: '+1234567890',
            recipients: '+1987654321',
        };

        await signal.sendMessage('New image available');
        expect(axios.post).toHaveBeenCalledWith(
            'http://signal-cli:8080/v2/send',
            {
                message: 'New image available',
                number: '+1234567890',
                recipients: ['+1987654321'],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
