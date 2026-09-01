// @ts-nocheck
import Whatsapp from './Whatsapp';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({
        data: {
            messaging_product: 'whatsapp',
            contacts: [{ input: '123456789', wa_id: '123456789' }],
            messages: [{ id: 'wamid.HBgL...' }],
        },
    }),
}));

describe('Whatsapp Trigger', () => {
    let whatsapp;

    beforeEach(async () => {
        whatsapp = new Whatsapp();
        jest.clearAllMocks();
    });

    const configurationValid = {
        phonenumberid: '109876543210',
        token: 'EAAXxX...secrettoken',
        recipient: '15551234567',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Whatsapp, configurationValid);

    test('should throw error when phonenumberid is missing', async () => {
        const config = {
            token: 'EAAXxX...secrettoken',
            recipient: '15551234567',
        };
        expect(() => whatsapp.validateConfiguration(config)).toThrow();
    });

    test('should throw error when token is missing', async () => {
        const config = {
            phonenumberid: '109876543210',
            recipient: '15551234567',
        };
        expect(() => whatsapp.validateConfiguration(config)).toThrow();
    });

    test('should throw error when recipient is missing', async () => {
        const config = {
            phonenumberid: '109876543210',
            token: 'EAAXxX...secrettoken',
        };
        expect(() => whatsapp.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data', async () => {
        whatsapp.configuration = {
            phonenumberid: '109876543210',
            token: 'EAAXxX...secrettoken',
            recipient: '15551234567',
            url: 'https://graph.facebook.com/v19.0',
        };
        const masked = whatsapp.maskConfiguration();
        // '109876543210' is 12 chars: '1' + 10 stars + '0'
        expect(masked.phonenumberid).toBe('1**********0');
        // 'EAAXxX...secrettoken' is 20 chars: 'E' + 18 stars + 'n'
        expect(masked.token).toBe('E******************n');
        // '15551234567' is 11 chars: '1' + 9 stars + '7'
        expect(masked.recipient).toBe('1*********7');
    });

    test('should send message to Graph API messages endpoint with Bearer token', async () => {
        const { default: axios } = await import('axios');
        whatsapp.configuration = {
            phonenumberid: '109876543210',
            token: 'EAAXxX...secrettoken',
            recipient: '15551234567',
            url: 'https://graph.facebook.com/v19.0',
        };

        await whatsapp.sendMessage('Docker update alert');
        expect(axios.post).toHaveBeenCalledWith(
            'https://graph.facebook.com/v19.0/109876543210/messages',
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: '15551234567',
                type: 'text',
                text: {
                    preview_url: true,
                    body: 'Docker update alert',
                },
            },
            {
                headers: {
                    Authorization: 'Bearer EAAXxX...secrettoken',
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
