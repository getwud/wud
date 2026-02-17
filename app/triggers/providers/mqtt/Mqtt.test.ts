// @ts-nocheck
import { ValidationError } from 'joi';
import mqttClient from 'mqtt';
import log from '../../../log';
import { flatten } from '../../../model/container';

jest.mock('mqtt');
import Mqtt from './Mqtt';

const mqtt = new Mqtt();
mqtt.log = log;

const configurationValid = {
    url: 'mqtt://host:1883',
    topic: 'wud/container',
    clientid: 'wud',
    hass: {
        discovery: false,
        enabled: false,
        prefix: 'homeassistant',
    },
    tls: {
        clientkey: undefined,
        clientcert: undefined,
        cachain: undefined,
        rejectunauthorized: true,
    },
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

const containerData = [
    {
        containerName: 'homeassistant',
        data: {
            name: 'homeassistant',
            topic: 'wud/container/local/homeassistant',
        },
    },
    {
        containerName: 'home.assistant',
        data: {
            name: 'home.assistant',
            topic: 'wud/container/local/home-assistant',
        },
    },
];

beforeEach(async () => {
    jest.resetAllMocks();
    mqtt.client = {
        publish: jest.fn(() => {}),
    };
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        mqtt.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', async () => {
    const validatedConfiguration = mqtt.validateConfiguration({
        url: configurationValid.url,
        clientid: 'wud',
    });
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        url: 'http://invalid',
    };
    expect(() => {
        mqtt.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', async () => {
    mqtt.configuration = {
        password: 'password',
        url: 'mqtt://host:1883',
        topic: 'wud/container',
        hass: {
            discovery: false,
            enabled: false,
            prefix: 'homeassistant',
        },
    };
    expect(mqtt.maskConfiguration()).toEqual({
        hass: {
            discovery: false,
            enabled: false,
            prefix: 'homeassistant',
        },
        password: 'p******d',
        topic: 'wud/container',
        url: 'mqtt://host:1883',
    });
});

test('initTrigger should init Mqtt client', async () => {
    mqtt.configuration = {
        ...configurationValid,
        user: 'user',
        password: 'password',
        clientid: 'wud',
        hass: {
            enabled: true,
            discovery: true,
            prefix: 'homeassistant',
        },
    };
    const spy = jest.spyOn(mqttClient, 'connectAsync');
    await mqtt.initTrigger();
    expect(spy).toHaveBeenCalledWith('mqtt://host:1883', {
        clientId: 'wud',
        username: 'user',
        password: 'password',
        rejectUnauthorized: true,
    });
});

test.each(containerData)(
    'trigger should format json message payload as expected',
    async ({ containerName, data }) => {
        mqtt.configuration = {
            topic: 'wud/container',
        };
        const container = {
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: containerName,
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
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                tag: '2021.6.5',
            },
        };
        await mqtt.trigger(container);
        expect(mqtt.client.publish).toHaveBeenCalledWith(
            data.topic,
            JSON.stringify(flatten(container)),
            { retain: true },
        );
    },
);
