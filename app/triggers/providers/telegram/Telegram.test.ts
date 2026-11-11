import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ValidationError } from 'joi';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Container } from '../../../model/container';
import Telegram from './Telegram';
import { testTriggerProvider } from '../TriggerTestHelper';

jest.mock('axios', () => ({
    post: jest.fn(),
    isAxiosError: (error: unknown): boolean =>
        Boolean(
            error &&
                typeof error === 'object' &&
                'isAxiosError' in error &&
                (error as { isAxiosError: boolean }).isAxiosError === true,
        ),
}));

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;
const emptyContainer = {} as Container;

const telegram = new Telegram();

const configurationValid = {
    bottoken: 'token',
    chatid: '123456789',
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',

    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

    batchtitle: '${containers.length} updates available',
    disabletitle: false,
    messageformat: 'Markdown',
};

testTriggerProvider(Telegram, configurationValid);

beforeEach(async () => {
    jest.restoreAllMocks();
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({ status: 200, data: {} } as any);
    (telegram as any).proxyAgent = undefined;
    telegram.configuration = { ...configurationValid };
    telegram.name = undefined as any;
});

test('maskConfiguration should mask sensitive data', async () => {
    telegram.configuration = configurationValid;
    expect(telegram.maskConfiguration()).toEqual({
        batchtitle: '${containers.length} updates available',
        bottoken: 't***n',
        chatid: '1*******9',
        mode: 'simple',
        once: true,
        auto: true,
        simplebody:
            'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

        simpletitle:
            'New ${container.updateKind.kind} found for container ${container.name}',
        threshold: 'all',
        disabletitle: false,
        messageformat: 'Markdown',
    });
});

test('validateConfiguration should accept an optional proxy url', async () => {
    const validatedConfiguration = telegram.validateConfiguration({
        ...configurationValid,
        proxy: 'socks5://user:pass@host:1080',
    });
    expect(validatedConfiguration.proxy).toEqual(
        'socks5://user:pass@host:1080',
    );
});

test('validateConfiguration should throw when proxy is not a valid url', async () => {
    expect(() => {
        telegram.validateConfiguration({
            ...configurationValid,
            proxy: 'not a url',
        });
    }).toThrow(ValidationError);
});

test('maskConfiguration should mask only the proxy password', async () => {
    telegram.configuration = {
        ...configurationValid,
        proxy: 'socks5://user:secret@host:1080',
    };
    expect(telegram.maskConfiguration().proxy).toEqual(
        'socks5://user:***@host:1080',
    );
});

test.each([
    { proxy: 'socks5://user:pass@host:1080', agentType: SocksProxyAgent },
    { proxy: 'socks://user:pass@host:1080', agentType: SocksProxyAgent },
    { proxy: 'http://user:pass@host:8118', agentType: HttpsProxyAgent },
    { proxy: 'https://user:pass@host:8118', agentType: HttpsProxyAgent },
])(
    'initTrigger should build a proxy agent for %s',
    async ({ proxy, agentType }) => {
        telegram.configuration = { ...configurationValid, proxy };
        await telegram.initTrigger();
        expect((telegram as any).proxyAgent).toBeInstanceOf(agentType);
    },
);

test('initTrigger should not set a proxy agent when proxy is not configured', async () => {
    telegram.configuration = { ...configurationValid };
    await telegram.initTrigger();
    expect((telegram as any).proxyAgent).toBeUndefined();
});

test('should send message with correct text', async () => {
    telegram.configuration = {
        ...configurationValid,
        simpletitle: 'Test Title',
        simplebody: 'Test Body',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);
    await telegram.trigger(emptyContainer);

    expect(sendMessageSpy).toHaveBeenCalledWith('*Test Title*\n\nTest Body');
});

test.each([
    { messageformat: 'Markdown', expected: '*Test Title*\n\nTest Body' },
    { messageformat: 'HTML', expected: '<b>Test Title</b>\n\nTest Body' },
])(
    'should send message with correct text in %s format',
    async ({ messageformat, expected }) => {
        telegram.configuration = {
            ...configurationValid,
            simpletitle: 'Test Title',
            simplebody: 'Test Body',
            messageformat: messageformat,
        };
        const sendMessageSpy = jest
            .spyOn(telegram as any, 'sendMessage')
            .mockResolvedValue(undefined);
        await telegram.trigger(emptyContainer);
        expect(sendMessageSpy).toHaveBeenCalledWith(expected);
    },
);

test('disabletitle should result in no title in message', async () => {
    telegram.configuration = {
        ...configurationValid,
        simpletitle: 'Test Title',
        simplebody: 'Test Body',
        disabletitle: true,
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.trigger(emptyContainer);

    expect(sendMessageSpy).toHaveBeenCalledWith('Test Body');
});

test('triggerBatch should send batch notification', async () => {
    telegram.configuration = configurationValid;
    const containers: Container[] = [
        {
            name: 'container1',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        } as Container,
        {
            name: 'container2',
            updateKind: {
                kind: 'tag',
                localValue: '1.1.0',
                remoteValue: '2.1.0',
            },
        } as Container,
    ];
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);
    await telegram.triggerBatch(containers);
    expect(sendMessageSpy).toHaveBeenCalledWith(
        '*2 updates available*\n\n\\- Container container1 running with tag 1\\.0\\.0 can be updated to tag 2\\.0\\.0\n\n\\- Container container2 running with tag 1\\.1\\.0 can be updated to tag 2\\.1\\.0\n',
    );
});

test('triggerBatch should send batch notification in HTML format', async () => {
    telegram.configuration = {
        ...configurationValid,
        messageformat: 'HTML',
    };
    const containers: Container[] = [
        {
            name: 'container<1>',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        } as Container,
    ];
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);
    await telegram.triggerBatch(containers);
    expect(sendMessageSpy).toHaveBeenCalledWith(
        '<b>1 updates available</b>\n\n- Container container&lt;1&gt; running with tag 1.0.0 can be updated to tag 2.0.0\n',
    );
});

test('trigger with disabletitle should escape body in Markdown format', async () => {
    telegram.configuration = {
        ...configurationValid,
        simplebody: 'Container test-app running 1.0.0 -> 2.0.0',
        disabletitle: true,
        messageformat: 'Markdown',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.trigger(emptyContainer);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        'Container test\\-app running 1\\.0\\.0 \\-\\> 2\\.0\\.0',
    );
});

test('trigger with disabletitle should escape body in HTML format', async () => {
    telegram.configuration = {
        ...configurationValid,
        simplebody: 'Container <app> & service running 1.0.0 -> 2.0.0',
        disabletitle: true,
        messageformat: 'HTML',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.trigger(emptyContainer);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        'Container &lt;app&gt; &amp; service running 1.0.0 -&gt; 2.0.0',
    );
});

test('triggerBatch with disabletitle should escape body in Markdown format', async () => {
    telegram.configuration = {
        ...configurationValid,
        disabletitle: true,
        messageformat: 'Markdown',
    };
    const containers: Container[] = [
        {
            name: 'container1',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        } as Container,
    ];
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.triggerBatch(containers);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        '\\- Container container1 running with tag 1\\.0\\.0 can be updated to tag 2\\.0\\.0\n',
    );
});

test('triggerBatch with disabletitle should escape body in HTML format', async () => {
    telegram.configuration = {
        ...configurationValid,
        disabletitle: true,
        messageformat: 'HTML',
    };
    const containers: Container[] = [
        {
            name: 'container<1>',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        } as Container,
    ];
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.triggerBatch(containers);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        '- Container container&lt;1&gt; running with tag 1.0.0 can be updated to tag 2.0.0\n',
    );
});

test('trigger with HTML format should escape HTML entities in title and body without backslashes', async () => {
    telegram.configuration = {
        ...configurationValid,
        simpletitle: 'Update for <web> & "db"',
        simplebody: 'Container <web> updated: 1.0.0 -> 2.0.0',
        messageformat: 'HTML',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.trigger(emptyContainer);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        '<b>Update for &lt;web&gt; &amp; "db"</b>\n\nContainer &lt;web&gt; updated: 1.0.0 -&gt; 2.0.0',
    );
});

test('triggerRollback should escape message in Markdown format', async () => {
    telegram.configuration = {
        ...configurationValid,
        messageformat: 'Markdown',
    };
    const rollbackReport = {
        scope: 'container' as const,
        status: 'succeeded' as const,
        container: { name: 'my-app' } as Container,
        oldImageRef: 'repo/app:1.0.0',
        newImageRef: 'repo/app:2.0.0',
        reason: 'healthcheck failed',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.triggerRollback(rollbackReport);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        '*Rollback of my\\-app \\(healthcheck failed\\)*\n\nContainer my\\-app was rolled back from repo/app:2\\.0\\.0 to repo/app:1\\.0\\.0 \\(reason: healthcheck failed\\)\\.',
    );
});

test('triggerRollback should escape message in HTML format', async () => {
    telegram.configuration = {
        ...configurationValid,
        messageformat: 'HTML',
    };
    const rollbackReport = {
        scope: 'container' as const,
        status: 'succeeded' as const,
        container: { name: '<my-app>' } as Container,
        oldImageRef: 'repo/app:1.0.0',
        newImageRef: 'repo/app:2.0.0',
        reason: 'healthcheck failed & bad state',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.triggerRollback(rollbackReport);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        '<b>Rollback of &lt;my-app&gt; (healthcheck failed &amp; bad state)</b>\n\nContainer &lt;my-app&gt; was rolled back from repo/app:2.0.0 to repo/app:1.0.0 (reason: healthcheck failed &amp; bad state).',
    );
});

test('triggerRollback with disabletitle should escape body in Markdown format', async () => {
    telegram.configuration = {
        ...configurationValid,
        disabletitle: true,
        messageformat: 'Markdown',
    };
    const rollbackReport = {
        scope: 'container' as const,
        status: 'succeeded' as const,
        container: { name: 'my-app' } as Container,
        oldImageRef: 'repo/app:1.0.0',
        newImageRef: 'repo/app:2.0.0',
        reason: 'healthcheck failed',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.triggerRollback(rollbackReport);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        'Container my\\-app was rolled back from repo/app:2\\.0\\.0 to repo/app:1\\.0\\.0 \\(reason: healthcheck failed\\)\\.',
    );
});

test('triggerRollback should pass message_thread_id when configured', async () => {
    telegram.configuration = {
        ...configurationValid,
        messagethreadid: 999,
    };
    const rollbackReport = {
        scope: 'container' as const,
        status: 'succeeded' as const,
        container: { name: 'my-app' } as Container,
        oldImageRef: 'repo/app:1.0.0',
        newImageRef: 'repo/app:2.0.0',
        reason: 'healthcheck failed',
    };
    const sendMessageSpy = jest
        .spyOn(telegram as any, 'sendMessage')
        .mockResolvedValue(undefined);

    await telegram.triggerRollback(rollbackReport);

    expect(sendMessageSpy).toHaveBeenCalledWith(
        '*Rollback of my\\-app \\(healthcheck failed\\)*\n\nContainer my\\-app was rolled back from repo/app:2\\.0\\.0 to repo/app:1\\.0\\.0 \\(reason: healthcheck failed\\)\\.',
        999,
    );
});

test('sendMessage should log error when response status is not 2xx', async () => {
    telegram.configuration = configurationValid;
    mockedPost.mockResolvedValueOnce({
        status: 400,
        data: { ok: false },
    } as any);
    const logErrorSpy = jest.spyOn((telegram as any).log, 'error');

    await (telegram as any).sendMessage('test');

    expect(logErrorSpy).toHaveBeenCalledWith(
        'Failed to send message to Telegram: {"ok":false}',
    );
});

test('sendMessage should throw and log detailed Telegram error description when available', async () => {
    telegram.configuration = configurationValid;
    const axiosError = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
        response: {
            status: 400,
            data: {
                ok: false,
                error_code: 400,
                description:
                    "Bad Request: can't parse entities: Character '-' is reserved and must be escaped with the preceding '\\'",
            },
        },
    };
    mockedPost.mockRejectedValueOnce(axiosError);
    const logErrorSpy = jest.spyOn((telegram as any).log, 'error');

    await expect((telegram as any).sendMessage('test')).rejects.toThrow(
        "Failed to send message to Telegram: Bad Request: can't parse entities: Character '-' is reserved and must be escaped with the preceding '\\'",
    );

    expect(logErrorSpy).toHaveBeenCalledWith(
        "Failed to send message to Telegram: Bad Request: can't parse entities: Character '-' is reserved and must be escaped with the preceding '\\'",
    );
});

test('sendMessage should rethrow original error when no Telegram description is present', async () => {
    telegram.configuration = configurationValid;
    const genericError = new Error('Network error');
    mockedPost.mockRejectedValueOnce(genericError);

    await expect((telegram as any).sendMessage('test')).rejects.toThrow(
        'Network error',
    );
});

test('sendMessage should call the Telegram API with proxy settings when configured', async () => {
    telegram.configuration = {
        ...configurationValid,
        proxy: 'http://user:pass@host:8118',
    };

    await telegram.initTrigger();
    await (telegram as any).sendMessage('Test Body');

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        {
            chat_id: configurationValid.chatid,
            text: 'Test Body',
            parse_mode: 'MarkdownV2',
        },
        expect.objectContaining({
            proxy: false,
            httpAgent: expect.any(HttpsProxyAgent),
            httpsAgent: expect.any(HttpsProxyAgent),
        }),
    );
});

test('validateConfiguration should accept messagethreadid as integer or string', () => {
    const configWithNumber = telegram.validateConfiguration({
        ...configurationValid,
        messagethreadid: 12345,
    });
    expect(configWithNumber.messagethreadid).toEqual(12345);

    const configWithString = telegram.validateConfiguration({
        ...configurationValid,
        messagethreadid: '67890',
    });
    expect(configWithString.messagethreadid).toEqual('67890');
});

test('validateConfiguration should normalize message_thread_id and message.thread.id to messagethreadid', () => {
    const configWithUnderscore = telegram.validateConfiguration({
        ...configurationValid,
        message_thread_id: 111,
    });
    expect(configWithUnderscore.messagethreadid).toEqual(111);
    expect(configWithUnderscore.message_thread_id).toBeUndefined();

    const configWithNested = telegram.validateConfiguration({
        ...configurationValid,
        message: { thread: { id: 222 } },
    });
    expect(configWithNested.messagethreadid).toEqual(222);
    expect(configWithNested.message).toBeUndefined();
});

test('sendMessage should not include message_thread_id when not configured', async () => {
    telegram.configuration = { ...configurationValid };
    await (telegram as any).sendMessage('Test Body');

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        {
            chat_id: configurationValid.chatid,
            text: 'Test Body',
            parse_mode: 'MarkdownV2',
        },
        undefined,
    );
});

test('sendMessage should include message_thread_id when configured on trigger', async () => {
    telegram.configuration = {
        ...configurationValid,
        messagethreadid: 42,
    };
    await (telegram as any).sendMessage('Test Body');

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        {
            chat_id: configurationValid.chatid,
            text: 'Test Body',
            parse_mode: 'MarkdownV2',
            message_thread_id: 42,
        },
        undefined,
    );
});

test('trigger should use container label for message_thread_id over trigger configuration', async () => {
    telegram.name = 'telegram1';
    telegram.configuration = {
        ...configurationValid,
        messagethreadid: 42,
    };

    const containerWithLabel: Container = {
        name: 'test-container',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        labels: {
            'wud.trigger.telegram.telegram1.message_thread_id': '100',
        },
    } as any;

    await telegram.trigger(containerWithLabel);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: '100',
        }),
        undefined,
    );
});

test('trigger should fallback to generic container label for message_thread_id', async () => {
    telegram.name = 'telegram1';
    telegram.configuration = {
        ...configurationValid,
    };

    const containerWithGenericLabel: Container = {
        name: 'test-container',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        labels: {
            'wud.trigger.telegram.message_thread_id': '200',
        },
    } as any;

    await telegram.trigger(containerWithGenericLabel);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: '200',
        }),
        undefined,
    );
});

test('triggerBatch should pass message_thread_id from configuration', async () => {
    telegram.configuration = {
        ...configurationValid,
        messagethreadid: 555,
    };

    const containers: Container[] = [
        {
            name: 'container1',
            updateKind: { kind: 'tag', localValue: '1', remoteValue: '2' },
        } as any,
    ];

    await telegram.triggerBatch(containers);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: 555,
        }),
        undefined,
    );
});

test('trigger should recognize messagethreadid label without underscores', async () => {
    telegram.name = 'telegram1';
    telegram.configuration = {
        ...configurationValid,
    };

    const containerWithLabel: Container = {
        name: 'test-container',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        labels: {
            'wud.trigger.telegram.telegram1.messagethreadid': '300',
        },
    } as any;

    await telegram.trigger(containerWithLabel);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: '300',
        }),
        undefined,
    );
});

test('trigger should recognize generic messagethreadid label without underscores', async () => {
    telegram.name = 'telegram1';
    telegram.configuration = {
        ...configurationValid,
    };

    const containerWithLabel: Container = {
        name: 'test-container',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        labels: {
            'wud.trigger.telegram.messagethreadid': '400',
        },
    } as any;

    await telegram.trigger(containerWithLabel);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: '400',
        }),
        undefined,
    );
});

test('trigger with disabletitle should also include message_thread_id', async () => {
    telegram.configuration = {
        ...configurationValid,
        disabletitle: true,
        messagethreadid: 777,
    };

    const container: Container = {
        name: 'test-container',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    } as any;

    await telegram.trigger(container);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: 777,
        }),
        undefined,
    );
});

test('triggerBatch with disabletitle should also include message_thread_id from first container label', async () => {
    telegram.configuration = {
        ...configurationValid,
        disabletitle: true,
    };

    const containers: Container[] = [
        {
            name: 'container1',
            updateKind: { kind: 'tag', localValue: '1', remoteValue: '2' },
            labels: {
                'wud.trigger.telegram.message_thread_id': '888',
            },
        } as any,
    ];

    await telegram.triggerBatch(containers);

    expect(mockedPost).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/sendMessage',
        expect.objectContaining({
            message_thread_id: '888',
        }),
        undefined,
    );
});
