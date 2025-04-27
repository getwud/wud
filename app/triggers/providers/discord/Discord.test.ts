import { ValidationError } from 'joi';
import rp from 'request-promise-native';

jest.mock('request-promise-native');
import { Discord, DiscordConfiguration } from './Discord';
import { Container } from '../../../model/container';

const discord = new Discord();

const configurationValid: DiscordConfiguration = {
    url: 'https://discord.com/api/webhooks/1',
    botusername: 'Bot Name',
    cardcolor: 65280,
    cardlabel: 'Container',
    auto: true,
    threshold: 'all',
    mode: 'simple',
    once: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',

    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

    batchtitle: '${containers.length} updates available',
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
    const configuration = {} as DiscordConfiguration;
    expect(() => {
        discord.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    discord.configuration = configurationValid;
    expect(discord.maskConfiguration()).toEqual({
        batchtitle: '${containers.length} updates available',
        botusername: 'Bot Name',
        url: 'h********************************1',
        mode: 'simple',
        cardcolor: 65280,
        cardlabel: 'Container',
        once: true,
        auto: true,
        simplebody:
            'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

        simpletitle:
            'New ${container.updateKind.kind} found for container ${container.name}',
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
    } as Container;
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
                            value: 'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
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
