// @ts-nocheck
import Opsgenie from './Opsgenie';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: {} }),
}));

describe('Opsgenie Trigger', () => {
    let opsgenie;

    beforeEach(async () => {
        opsgenie = new Opsgenie();
        jest.clearAllMocks();
    });

    const configurationValid = {
        apikey: 'eb48f654-xxxx-xxxx-xxxx-xxxxxxx',
        region: 'eu',
        priority: 'P4',
        tags: 'docker, wud, homelab',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Opsgenie, configurationValid);

    test('should throw error when apikey is missing', async () => {
        const config = {
            region: 'us',
        };
        expect(() => opsgenie.validateConfiguration(config)).toThrow();
    });

    test('should throw error when region is invalid', async () => {
        const config = {
            apikey: 'key123',
            region: 'apac',
        };
        expect(() => opsgenie.validateConfiguration(config)).toThrow();
    });

    test('should throw error when priority is invalid', async () => {
        const config = {
            apikey: 'key123',
            priority: 'P9',
        };
        expect(() => opsgenie.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (apikey)', async () => {
        opsgenie.configuration = {
            apikey: 'eb48f654-xxxx-xxxx-xxxx-xxxxxxx',
            region: 'eu',
        };
        const masked = opsgenie.maskConfiguration();
        // 31 chars: 'e' + 29 stars + 'x'
        expect(masked.apikey).toBe('e*****************************x');
        expect(masked.region).toBe('eu');
    });

    test('should send alert to EU endpoint when region is eu', async () => {
        const { default: axios } = await import('axios');
        opsgenie.configuration = {
            apikey: 'eb48f654-xxxx-xxxx-xxxx-xxxxxxx',
            region: 'eu',
            priority: 'P4',
            tags: 'docker, prod',
        };

        const container = {
            name: 'frontend',
            watcher: 'local',
            updateKind: { localValue: '1.0', remoteValue: '1.1' },
        };

        await opsgenie.sendAlert('New version', 'Details', container);
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.eu.opsgenie.com/v2/alerts',
            {
                message: 'New version',
                description: 'Details',
                priority: 'P4',
                source: 'WUD',
                tags: ['docker', 'prod'],
                details: {
                    containerName: 'frontend',
                    watcher: 'local',
                    localTag: '1.0',
                    remoteTag: '1.1',
                },
            },
            {
                headers: {
                    Authorization: 'GenieKey eb48f654-xxxx-xxxx-xxxx-xxxxxxx',
                    'Content-Type': 'application/json',
                },
            },
        );
    });

    test('should send alert to US endpoint when region is us', async () => {
        const { default: axios } = await import('axios');
        opsgenie.configuration = {
            apikey: 'eb48f654-xxxx-xxxx-xxxx-xxxxxxx',
            region: 'us',
            priority: 'P5',
            tags: 'wud',
        };

        await opsgenie.sendAlert('Batch update', 'Details');
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.opsgenie.com/v2/alerts',
            {
                message: 'Batch update',
                description: 'Details',
                priority: 'P5',
                source: 'WUD',
                tags: ['wud'],
            },
            {
                headers: {
                    Authorization: 'GenieKey eb48f654-xxxx-xxxx-xxxx-xxxxxxx',
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
