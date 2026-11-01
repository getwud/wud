// @ts-nocheck
import { ValidationError } from 'joi';
import Trigger from '../Trigger';
import Xmpp from './Xmpp';
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
            send: mockSend,
        })),
        xml: jest.fn((name, attrs, ...children) => ({ name, attrs, children })),
    };
});

const xmpp = new Xmpp();

beforeEach(() => {
    jest.clearAllMocks();
});

const configurationValid = {
    service: 'xmpps://chat.example.com:5223',
    domain: 'example.com',
    user: 'user',
    password: 'password123',
    to: 'friend@example.com',
    timeout: 10000,
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
    const validatedConfiguration =
        xmpp.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        preload: false,
        rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
        events: ['available'],
        successtitle: 'Update SUCCESS for ${container.name}',
        successbody:
            'Container ${container.name} has been successfully updated.',
        failuretitle: 'Update FAILED for ${container.name}',
        failurebody: 'Container ${container.name} update failed: ${error}',
        rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
    });
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

    expect(xml).toHaveBeenCalledWith(
        'body',
        {},
        expect.stringContaining('homeassistant'),
    );

    expect(xml).toHaveBeenCalledWith(
        'message',
        { type: 'chat', to: configurationValid.to },
        expect.anything(),
    );

    const mockClientInstance = (client as jest.Mock).mock.results[0].value;
    expect(mockClientInstance.send).toHaveBeenCalled();
    expect(mockClientInstance.stop).toHaveBeenCalled();
});

test('trigger should fail when the xmpp session hangs', async () => {
    xmpp.configuration = { ...configurationValid, timeout: 5000 };

    const hangingClient = {
        on: jest.fn(),
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        send: jest.fn().mockResolvedValue(undefined),
    };
    (client as jest.Mock).mockImplementationOnce(() => hangingClient);

    jest.useFakeTimers();
    try {
        const promise = xmpp.trigger({
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        });
        const assertion = expect(promise).rejects.toThrow(
            'XMPP session timed out after 5000ms',
        );
        jest.advanceTimersByTime(5000);
        await assertion;
        expect(hangingClient.stop).toHaveBeenCalled();
    } finally {
        jest.useRealTimers();
    }
});

test('trigger should fail and still close the connection when xmpp send fails', async () => {
    xmpp.configuration = configurationValid;

    const failingClient = {
        on: jest.fn((event, cb) => {
            if (event === 'online') {
                cb({ toString: () => 'user@domain.com' });
            }
        }),
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        send: jest.fn().mockRejectedValue(new Error('send failed')),
    };
    (client as jest.Mock).mockImplementationOnce(() => failingClient);

    await expect(
        xmpp.trigger({
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        }),
    ).rejects.toThrow('send failed');

    expect(failingClient.stop).toHaveBeenCalled();
});

test('triggerRollback should send xmpp message as expected', async () => {
    xmpp.configuration = configurationValid;
    await xmpp.triggerRollback({
        scope: 'container',
        container: { name: 'homeassistant' },
        reason: 'unhealthy',
        status: 'succeeded',
    });

    expect(client).toHaveBeenCalledWith({
        service: configurationValid.service,
        domain: configurationValid.domain,
        username: configurationValid.user,
        password: configurationValid.password,
    });

    expect(xml).toHaveBeenCalledWith(
        'body',
        {},
        expect.stringContaining('homeassistant'),
    );

    expect(xml).toHaveBeenCalledWith(
        'message',
        { type: 'chat', to: configurationValid.to },
        expect.anything(),
    );

    const mockClientInstance = (client as jest.Mock).mock.results[0].value;
    expect(mockClientInstance.send).toHaveBeenCalled();
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

    expect(xml).toHaveBeenCalledWith(
        'message',
        { type: 'chat', to: configurationValid.to },
        expect.anything(),
    );

    const mockClientInstance = (client as jest.Mock).mock.results[0].value;
    expect(mockClientInstance.send).toHaveBeenCalled();
});
