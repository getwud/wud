// @ts-nocheck
import Prowl from './Prowl';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest
        .fn()
        .mockResolvedValue({ data: '<success code="200" remaining="999" />' }),
}));

describe('Prowl Trigger', () => {
    let prowl;

    beforeEach(async () => {
        prowl = new Prowl();
        jest.clearAllMocks();
    });

    const configurationValid = {
        apikey: 'abcdef1234567890abcdef1234567890abcdef12',
        priority: 1,
        application: 'WUD-Prod',
        url: 'https://api.prowlapp.com/publicapi/add',
        openurl: 'https://example.com',
        providerkey: 'provider_secret_key',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Prowl, configurationValid);

    test('should throw error when apikey is missing', async () => {
        const config = {
            priority: 0,
        };
        expect(() => prowl.validateConfiguration(config)).toThrow();
    });

    test('should throw error when priority is out of range', async () => {
        const config = {
            apikey: 'abcdef1234567890abcdef1234567890abcdef12',
            priority: 5,
        };
        expect(() => prowl.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (apikey and providerkey)', async () => {
        prowl.configuration = {
            apikey: 'abcdef1234567890abcdef1234567890abcdef12',
            providerkey: 'provider_secret_key',
            application: 'WUD',
        };
        const masked = prowl.maskConfiguration();
        // 40 chars: 'a' + 38 stars + '2'
        expect(masked.apikey).toBe('a**************************************2');
        // 19 chars: 'p' + 17 stars + 'y'
        expect(masked.providerkey).toBe('p*****************y');
        expect(masked.application).toBe('WUD');
    });

    test('should send push notification via POST with encoded parameters', async () => {
        const { default: axios } = await import('axios');
        prowl.configuration = {
            apikey: 'abcdef1234567890abcdef1234567890abcdef12',
            priority: 1,
            application: 'WUD',
            url: 'https://api.prowlapp.com/publicapi/add',
            openurl: 'https://example.com/app',
            providerkey: 'provider_key',
        };

        await prowl.sendMessage(
            'New update',
            'Container nginx updated',
            'https://fallback.com',
        );
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.prowlapp.com/publicapi/add',
            'apikey=abcdef1234567890abcdef1234567890abcdef12&priority=1&application=WUD&event=New+update&description=Container+nginx+updated&url=https%3A%2F%2Fexample.com%2Fapp&providerkey=provider_key',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    });

    test('should fallback to link when openurl is not set', async () => {
        const { default: axios } = await import('axios');
        prowl.configuration = {
            apikey: 'abcdef1234567890abcdef1234567890abcdef12',
            priority: 0,
            application: 'WUD',
            url: 'https://api.prowlapp.com/publicapi/add',
        };

        await prowl.sendMessage(
            'New update',
            'Container nginx updated',
            'https://registry.hub.docker.com',
        );
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.prowlapp.com/publicapi/add',
            'apikey=abcdef1234567890abcdef1234567890abcdef12&priority=0&application=WUD&event=New+update&description=Container+nginx+updated&url=https%3A%2F%2Fregistry.hub.docker.com',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    });
});
