import { ValidationError } from 'joi';
import Telegram from './Telegram';
import { Container } from '../../../model/container';

jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: {} }),
}));

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

beforeEach(async () => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        telegram.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {};
    expect(() => {
        telegram.validateConfiguration(configuration);
    }).toThrow(ValidationError);
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
        '*2 updates available*\n\n- Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n\n- Container container2 running with tag 1.1.0 can be updated to tag 2.1.0\n',
    );
});
