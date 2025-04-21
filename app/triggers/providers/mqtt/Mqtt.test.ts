import { ValidationError } from 'joi';
import mqttClient, { MqttClient } from 'mqtt';
import log from '../../../log';

jest.mock('mqtt');
import { Mqtt } from './Mqtt';
import { MqttConfiguration } from './MqttConfiguration';

const mqtt = new Mqtt();
mqtt.log = log;

const configurationValid: MqttConfiguration = {
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

beforeEach(() => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        mqtt.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = mqtt.validateConfiguration({
        url: configurationValid.url,
        clientid: 'wud',
    } as MqttConfiguration);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'http://invalid',
    } as MqttConfiguration;
    expect(() => {
        mqtt.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    mqtt.configuration = {
        password: 'password',
        url: 'mqtt://host:1883',
        topic: 'wud/container',
        hass: {
            discovery: false,
            enabled: false,
            prefix: 'homeassistant',
        },
    } as MqttConfiguration;
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

test('trigger should format json message payload as expected', async () => {
    mqtt.configuration = {
        topic: 'wud/container',
    } as MqttConfiguration;
    mqtt.client = {
        publish: (topic: any, message: any) => ({
            topic,
            message,
        }),
    } as unknown as MqttClient;
    const response: any = await mqtt.trigger({
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
    });
    expect(response.message).toEqual(
        '{"id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816","name":"homeassistant","watcher":"local","include_tags":"^\\\\d+\\\\.\\\\d+.\\\\d+$","image_id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6","image_registry_url":"123456789.dkr.ecr.eu-west-1.amazonaws.com","image_name":"test","image_tag_value":"2021.6.4","image_tag_semver":true,"image_digest_watch":false,"image_digest_repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72","image_architecture":"amd64","image_os":"linux","image_created":"2021-06-12T05:33:38.440Z","result_tag":"2021.6.5"}',
    );
});
