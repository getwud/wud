const { ValidationError } = require('joi');
const rp = require('request-promise-native');

jest.mock('request-promise-native');

const Ifttt = require('./Ifttt');

const ifttt = new Ifttt();

const configurationValid = {
    key: 'secret',
    event: 'wud-image',
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
        ifttt.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = ifttt.validateConfiguration({
        key: configurationValid.key,
    });
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {};
    expect(() => {
        ifttt.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    ifttt.configuration = {
        key: 'key',
        event: 'event',
    };
    expect(ifttt.maskConfiguration()).toEqual({
        key: 'k*y',
        event: 'event',
    });
});

test('trigger should send http request to IFTTT', async () => {
    ifttt.configuration = {
        key: 'key',
        event: 'event',
    };
    const container = {
        name: 'container1',
        result: {
            tag: '2.0.0',
        },
    };
    await ifttt.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            value1: 'container1',
            value2: '2.0.0',
            value3: '{"name":"container1","result":{"tag":"2.0.0"}}',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        json: true,
        uri: 'https://maker.ifttt.com/trigger/event/with/key/key',
    });
});
