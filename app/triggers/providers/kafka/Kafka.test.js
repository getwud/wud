const { ValidationError } = require('joi');
const { Kafka: KafkaClient } = require('kafkajs');

jest.mock('kafkajs');

const Kafka = require('./Kafka');

const kafka = new Kafka();

const configurationValid = {
    brokers: 'broker1:9000, broker2:9000',
    topic: 'wud-container',
    clientId: 'wud',
    ssl: false,
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
        kafka.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = kafka.validateConfiguration({
        brokers: 'broker1:9000, broker2:9000',
    });
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should validate_optional_authentication', () => {
    const validatedConfiguration = kafka.validateConfiguration({
        ...configurationValid,
        authentication: {
            user: 'user',
            password: 'password',
        },
    });
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
    };
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
    };
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
    };
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
    };
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
    };
    await kafka.initTrigger();
    expect(KafkaClient).toHaveBeenCalledWith({
        brokers: ['broker1:9000', 'broker2:9000'],
        clientId: 'wud',
        ssl: false,
        sasl: {
            mechanism: 'PLAIN',
            password: 'password',
            username: 'user',
        },
    });
});

test('trigger should post message to kafka', async () => {
    const producer = () => ({
        connect: () => ({}),
        send: (params) => params,
    });
    kafka.kafka = {
        producer,
    };
    kafka.configuration = {
        topic: 'topic',
    };
    const container = {
        name: 'container1',
    };
    const result = await kafka.trigger(container);
    expect(result).toStrictEqual({
        messages: [{ value: '{"name":"container1"}' }],
        topic: 'topic',
    });
});
