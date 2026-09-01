// @ts-nocheck
import Amqp from './Amqp';
import { testTriggerProvider } from '../TriggerTestHelper';

jest.mock('amqplib', () => {
    const channel = {
        assertExchange: jest.fn().mockResolvedValue({}),
        publish: jest.fn().mockReturnValue(true),
        close: jest.fn().mockResolvedValue({}),
    };
    const connection = {
        createChannel: jest.fn().mockResolvedValue(channel),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue({}),
    };
    return {
        connect: jest.fn().mockResolvedValue(connection),
        _mockChannel: channel,
        _mockConnection: connection,
    };
});

describe('Amqp Trigger', () => {
    let amqpTrigger;

    beforeEach(async () => {
        amqpTrigger = new Amqp();
        jest.clearAllMocks();
    });

    const configurationValid = {
        url: 'amqp://guest:guest@localhost:5672',
        exchange: 'wud-exchange',
        routingkey: 'wud.updates',
        exchangetype: 'topic',
        persistent: true,
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Amqp, configurationValid);

    test('should throw error when URL is missing', async () => {
        const config = {
            exchange: 'wud',
        };
        expect(() => amqpTrigger.validateConfiguration(config)).toThrow();
    });

    test('should throw error when scheme is invalid', async () => {
        const config = {
            url: 'http://localhost:5672',
        };
        expect(() => amqpTrigger.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (url)', async () => {
        amqpTrigger.configuration = {
            url: 'amqp://guest:secretpassword@localhost:5672',
            exchange: 'wud',
            routingkey: 'updates',
        };
        const masked = amqpTrigger.maskConfiguration();
        // 42 chars: 'a' + 40 stars + '2'
        expect(masked.url).toBe('a****************************************2');
        expect(masked.exchange).toBe('wud');
    });

    test('should publish message to exchange and routing key', async () => {
        const amqp = await import('amqplib');
        const mockChannel = amqp._mockChannel;
        const mockConnection = amqp._mockConnection;

        amqpTrigger.configuration = {
            url: 'amqp://localhost:5672',
            exchange: 'wud-exchange',
            routingkey: 'wud.updates',
            exchangetype: 'topic',
            persistent: true,
        };

        const container = { name: 'nginx', watcher: 'local' };
        amqpTrigger.renderSimpleTitle = jest
            .fn()
            .mockReturnValue('Nginx Update');
        amqpTrigger.renderSimpleBody = jest.fn().mockReturnValue('New version');

        await amqpTrigger.trigger(container);

        expect(mockConnection.createChannel).toHaveBeenCalled();
        expect(mockChannel.assertExchange).toHaveBeenCalledWith(
            'wud-exchange',
            'topic',
            { durable: true },
        );
        expect(mockChannel.publish).toHaveBeenCalledWith(
            'wud-exchange',
            'wud.updates',
            expect.any(Buffer),
            {
                persistent: true,
                contentType: 'application/json',
            },
        );
    });

    test('should close channel and connection on deregisterComponent', async () => {
        const amqp = await import('amqplib');
        const mockChannel = amqp._mockChannel;
        const mockConnection = amqp._mockConnection;

        amqpTrigger.channel = mockChannel;
        amqpTrigger.connection = mockConnection;

        await amqpTrigger.deregisterComponent();
        expect(mockChannel.close).toHaveBeenCalled();
        expect(mockConnection.close).toHaveBeenCalled();
    });
});
