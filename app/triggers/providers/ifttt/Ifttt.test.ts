// @ts-nocheck
import { ValidationError } from 'joi';
import axios from 'axios';

jest.mock('axios');

import Ifttt from './Ifttt';

const ifttt = new Ifttt();

const configurationValid = {
    key: 'secret',
    event: 'wud-image',
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

beforeEach(async () => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        ifttt.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', async () => {
    const validatedConfiguration = ifttt.validateConfiguration({
        key: configurationValid.key,
    });
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {};
    expect(() => {
        ifttt.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', async () => {
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
    axios.mockResolvedValue({ data: {} });
    await ifttt.trigger(container);
    expect(axios).toHaveBeenCalledWith({
        data: {
            value1: 'container1',
            value2: '2.0.0',
            value3: '{"name":"container1","result":{"tag":"2.0.0"}}',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',

        url: 'https://maker.ifttt.com/trigger/event/with/key/key',
    });
});
