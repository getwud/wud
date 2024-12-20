const { ValidationError } = require('joi');
const rp = require('request-promise-native');

jest.mock('request-promise-native');
const Discord = require('./Discord');

const discord = new Discord();

const configurationValid = {
    url: 'https://discord.com/api/webhooks/1',
    botusername: 'Bot Name',
    cardcolor: 65280,
    cardlabel: 'Container',
    threshold: 'all',
    mode: 'simple',
    once: true,

    simpletitle: 'New ${kind} found for container ${name}',

    simplebody:
        'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',

    batchtitle: '${count} updates available',
};

beforeEach(() => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        discord.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {};
    expect(() => {
        discord.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    discord.configuration = configurationValid;
    expect(discord.maskConfiguration()).toEqual({
        batchtitle: '${count} updates available',
        botusername: 'Bot Name',
        url: 'h********************************1',
        mode: 'simple',
        cardcolor: 65280,
        cardlabel: 'Container',
        once: true,

        simplebody:
            'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',

        simpletitle: 'New ${kind} found for container ${name}',
        threshold: 'all',
    });
});

test('trigger should send POST http request to webhook endpoint', async () => {
    discord.configuration = configurationValid;
    const container = {
        name: 'container1',
        image: {
            tag: {
                value: '1.0.0',
            },
        },
        result: {
            tag: '2.0.0',
        },
        updateAvailable: true,
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
            semverDiff: 'major',
        },
    };
    await discord.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            username: 'Bot Name',
            embeds: [
                {
                    title: 'New tag found for container container1',
                    color: 65280,
                    fields: [
                        {
                            name: 'Container',
                            value: 'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n',
                        },
                    ],
                },
            ],
        },
        json: true,
        method: 'POST',
        uri: 'https://discord.com/api/webhooks/1',
    });
});
