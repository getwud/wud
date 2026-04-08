// @ts-nocheck
import { ValidationError } from 'joi';
import Xmpp from './Xmpp';
import bunyan from 'bunyan';
import { client, xml } from '@xmpp/client';

jest.mock('@xmpp/client', () => {
    const mockSend = jest.fn().mockResolvedValue(undefined);
    const mockStop = jest.fn().mockResolvedValue(undefined);
    const mockStart = jest.fn().mockResolvedValue(undefined);
    const mockOn = jest.fn((event, cb) => {
        if (event === 'online') {
            cb({ toString: () => 'user@domain.com' });
        }
    });

    return {
        client: jest.fn(() => ({
            on: mockOn,
            start: mockStart,
            stop: mockStop,
            send: mockSend
        })),
        xml: jest.fn((name, attrs, ...children) => ({ name, attrs, children }))
    };
});

const loggerBuffer = new bunyan.RingBuffer({ limit: 5 });
const log = bunyan.createLogger({
    name: 'Xmpp.Tests',
    streams: [{ stream: loggerBuffer }],
});

const xmpp = new Xmpp();
xmpp.log = log;

beforeEach(() => {
    loggerBuffer.records = [];
    jest.clearAllMocks();
});

const configurationValid = {
    service: 'xmpps://chat.example.com:5223',
    domain: 'example.com',
    user: 'user',
    password: 'password123',
    to: 'friend@example.com',
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',
    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
    batchtitle: '${containers.length} updates available',
};

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration = xmpp.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid service', () => {
    const configuration = {
        ...configurationValid,
        service: 'http://chat.example.com',
    };
    expect(() => {
        xmpp.validateConfiguration(configuration);
    }).toThrow(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    xmpp.configuration = {
        ...configurationValid,
    };
    expect(xmpp.maskConfiguration()).toEqual({
        ...configurationValid,
        password: 'p*********3',
    });
});

test('trigger should send xmpp message as expected', async () => {
    xmpp.configuration = configurationValid;
    await xmpp.trigger({
        id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
        name: 'homeassistant',
        watcher: 'local',
        includeTags: '^\\d+\\.\\d+.\\d+$',
        image: {
            id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
            },
            name: 'test',
            tag: {
                value: '2021.6.4',
                semver: true,
            },
        },
        result: {
            link: 'https://test-2.0.0/changelog',
        },
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    });

    expect(client).toHaveBeenCalledWith({
        service: configurationValid.service,
        domain: configurationValid.domain,
        username: configurationValid.user,
        password: configurationValid.password,
    });
});

test('triggerBatch should send xmpp message as expected', async () => {
    xmpp.configuration = configurationValid;
    await xmpp.triggerBatch([
        {
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        },
    ]);

    expect(client).toHaveBeenCalledWith({
        service: configurationValid.service,
        domain: configurationValid.domain,
        username: configurationValid.user,
        password: configurationValid.password,
    });
});
