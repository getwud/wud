import { ValidationError } from 'joi';
import { Kafka as KafkaClient, Producer, ProducerRecord } from 'kafkajs';

jest.mock('kafkajs');

import { Kafka, KafkaConfiguration } from './Kafka';
import { Container } from '../../../model/container';

const kafka = new Kafka();

const configurationValid: KafkaConfiguration = {
    brokers: 'broker1:9000, broker2:9000',
    topic: 'wud-container',
    clientId: 'wud',
    ssl: false,
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
        kafka.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = kafka.validateConfiguration({
        brokers: 'broker1:9000, broker2:9000',
    } as KafkaConfiguration);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should validate_optional_authentication', () => {
    const validatedConfiguration = kafka.validateConfiguration({
        ...configurationValid,
        authentication: {
            user: 'user',
            password: 'password',
        },
    } as KafkaConfiguration);
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        authentication: {
            user: 'user',
            password: 'password',
            type: 'PLAIN',
        },
    });
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        ssl: 'whynot',
    } as unknown as KafkaConfiguration;
    expect(() => {
        kafka.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    kafka.configuration = {
        brokers: 'broker1:9000, broker2:9000',
        topic: 'wud-image',
        clientId: 'wud',
        ssl: false,
        authentication: {
            type: 'PLAIN',
            user: 'user',
            password: 'password',
        },
    } as KafkaConfiguration;
    expect(kafka.maskConfiguration()).toEqual({
        brokers: 'broker1:9000, broker2:9000',
        topic: 'wud-image',
        clientId: 'wud',
        ssl: false,
        authentication: {
            type: 'PLAIN',
            user: 'user',
            password: 'p******d',
        },
    });
});

test('maskConfiguration should not fail if no auth provided', () => {
    kafka.configuration = {
        brokers: 'broker1:9000, broker2:9000',
        topic: 'wud-image',
        clientId: 'wud',
        ssl: false,
    } as KafkaConfiguration;
    expect(kafka.maskConfiguration()).toEqual({
        brokers: 'broker1:9000, broker2:9000',
        topic: 'wud-image',
        clientId: 'wud',
        ssl: false,
    });
});

test('initTrigger should init kafka client', async () => {
    kafka.configuration = {
        brokers: 'broker1:9000, broker2:9000',
        topic: 'wud-image',
        clientId: 'wud',
        ssl: false,
    } as KafkaConfiguration;
    await kafka.initTrigger();
    expect(KafkaClient).toHaveBeenCalledWith({
        brokers: ['broker1:9000', 'broker2:9000'],
        clientId: 'wud',
        ssl: false,
    });
});

test('initTrigger should init kafka client with auth when configured', async () => {
    kafka.configuration = {
        brokers: 'broker1:9000, broker2:9000',
        topic: 'wud-image',
        clientId: 'wud',
        ssl: false,
        authentication: {
            type: 'PLAIN',
            user: 'user',
            password: 'password',
        },
    } as KafkaConfiguration;
    await kafka.initTrigger();
    expect(KafkaClient).toHaveBeenCalledWith({
        brokers: ['broker1:9000', 'broker2:9000'],
        clientId: 'wud',
        ssl: false,
        sasl: {
            mechanism: 'plain',
            password: 'password',
            username: 'user',
        },
    });
});

test('trigger should post message to kafka', async () => {
    const producer = () => ({
        connect: () => ({}),
        send: (params: ProducerRecord) => params,
    } as unknown as Producer);
    kafka.kafka = {
        producer,
    } as KafkaClient;
    kafka.configuration = {
        topic: 'topic',
    } as KafkaConfiguration;
    const container = {
        name: 'container1',
    } as Container;
    const result = await kafka.trigger(container);
    expect(result).toStrictEqual({
        messages: [{ value: '{"name":"container1"}' }],
        topic: 'topic',
    });
});
