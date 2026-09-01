// @ts-nocheck
import Pagerduty from './Pagerduty';
import { testTriggerProvider } from '../TriggerTestHelper';

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({
        data: {
            status: 'success',
            message: 'Event processed',
            dedup_key: 'samplekey123',
        },
    }),
}));

describe('Pagerduty Trigger', () => {
    let pagerduty;

    beforeEach(async () => {
        pagerduty = new Pagerduty();
        jest.clearAllMocks();
    });

    const configurationValid = {
        routingkey: 'abcdef1234567890abcdef1234567890',
        severity: 'warning',
        source: 'WUD-Cluster-1',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Pagerduty, configurationValid);

    test('should throw error when routingkey is missing', async () => {
        const config = {
            severity: 'info',
        };
        expect(() => pagerduty.validateConfiguration(config)).toThrow();
    });

    test('should throw error when severity is invalid', async () => {
        const config = {
            routingkey: 'abcdef1234567890abcdef1234567890',
            severity: 'urgent',
        };
        expect(() => pagerduty.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (routingkey)', async () => {
        pagerduty.configuration = {
            routingkey: 'abcdef1234567890abcdef1234567890',
            severity: 'info',
            source: 'WUD',
        };
        const masked = pagerduty.maskConfiguration();
        // 32 chars: 'a' + 30 stars + '0'
        expect(masked.routingkey).toBe('a******************************0');
        expect(masked.severity).toBe('info');
    });

    test('should send event to PagerDuty with container details in payload', async () => {
        const { default: axios } = await import('axios');
        pagerduty.configuration = {
            routingkey: 'abcdef1234567890abcdef1234567890',
            severity: 'warning',
            source: 'WUD-Prod',
        };

        const container = {
            name: 'database',
            watcher: 'local',
            updateKind: { localValue: '14.1', remoteValue: '14.2' },
            result: { link: 'https://hub.docker.com/_/postgres' },
        };

        await pagerduty.sendEvent(
            'Postgres Update',
            'New image found',
            container,
        );
        expect(axios.post).toHaveBeenCalledWith(
            'https://events.pagerduty.com/v2/enqueue',
            {
                routing_key: 'abcdef1234567890abcdef1234567890',
                event_action: 'trigger',
                payload: {
                    summary: 'Postgres Update',
                    source: 'WUD-Prod',
                    severity: 'warning',
                    custom_details: {
                        message: 'New image found',
                        containerName: 'database',
                        watcher: 'local',
                        local: '14.1',
                        remote: '14.2',
                        link: 'https://hub.docker.com/_/postgres',
                    },
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    });
});
