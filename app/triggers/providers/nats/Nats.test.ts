// @ts-nocheck
import Nats from './Nats';
import { testTriggerProvider } from '../TriggerTestHelper';

jest.mock('nats', () => {
    const mockNc = {
        isClosed: jest.fn().mockReturnValue(false),
        publish: jest.fn(),
        drain: jest.fn().mockResolvedValue(),
    };
    return {
        connect: jest.fn().mockResolvedValue(mockNc),
        StringCodec: jest.fn().mockReturnValue({
            encode: jest.fn((str) => Buffer.from(str)),
            decode: jest.fn((buf) => buf.toString()),
        }),
        _mockNc: mockNc,
    };
});

describe('Nats Trigger', () => {
    let natsTrigger;

    beforeEach(async () => {
        natsTrigger = new Nats();
        jest.clearAllMocks();
    });

    const configurationValid = {
        servers: 'nats://localhost:4222',
        subject: 'wud.updates',
        user: 'wud',
        password: 'secretpassword123',
        threshold: 'all',
        mode: 'simple',
        once: true,
        auto: true,
    };

    testTriggerProvider(Nats, configurationValid);

    test('should throw error when servers is missing', async () => {
        const config = {
            subject: 'wud.updates',
        };
        expect(() => natsTrigger.validateConfiguration(config)).toThrow();
    });

    test('should mask configuration sensitive data (password, token, nkey)', async () => {
        natsTrigger.configuration = {
            servers: 'nats://localhost:4222',
            password: 'secretpassword123',
            token: 's3cr3tt0k3n',
            nkey: 'UABCEFGHIJKLMNOPQRSTUVWXYZ123456',
        };
        const masked = natsTrigger.maskConfiguration();
        // password: 's' + 15 stars + '3'
        expect(masked.password).toBe('s***************3');
        // token: 's' + 9 stars + 'n'
        expect(masked.token).toBe('s*********n');
        // nkey: 'U' + 30 stars + '6'
        expect(masked.nkey).toBe('U******************************6');
    });

    test('should publish message to subject in simple mode', async () => {
        const nats = await import('nats');
        natsTrigger.configuration = {
            servers: 'nats://localhost:4222,nats://localhost:4223',
            subject: 'wud.updates',
            user: 'wud',
            password: 'secretpassword123',
        };

        const container = { name: 'redis', watcher: 'local' };
        natsTrigger.renderSimpleTitle = jest
            .fn()
            .mockReturnValue('Redis Update');
        natsTrigger.renderSimpleBody = jest.fn().mockReturnValue('New version');

        await natsTrigger.trigger(container);

        expect(nats.connect).toHaveBeenCalledWith({
            servers: ['nats://localhost:4222', 'nats://localhost:4223'],
            user: 'wud',
            pass: 'secretpassword123',
        });
        expect(nats._mockNc.publish).toHaveBeenCalledWith(
            'wud.updates',
            expect.any(Buffer),
        );
    });

    test('should publish batch messages to subject in batch mode', async () => {
        const nats = await import('nats');
        natsTrigger.configuration = {
            servers: 'nats://localhost:4222',
            subject: 'wud.batch',
            token: 'mytoken',
        };

        const containers = [{ name: 'redis' }, { name: 'nginx' }];
        natsTrigger.renderBatchTitle = jest.fn().mockReturnValue('2 Updates');
        natsTrigger.renderBatchBody = jest.fn().mockReturnValue('Updates');

        await natsTrigger.triggerBatch(containers);

        expect(nats.connect).toHaveBeenCalledWith({
            servers: ['nats://localhost:4222'],
            token: 'mytoken',
        });
        expect(nats._mockNc.publish).toHaveBeenCalledWith(
            'wud.batch',
            expect.any(Buffer),
        );
    });

    test('should drain connection on deregisterComponent', async () => {
        const nats = await import('nats');
        natsTrigger.nc = nats._mockNc;

        await natsTrigger.deregisterComponent();
        expect(nats._mockNc.drain).toHaveBeenCalled();
    });
});
