import { ValidationError } from 'joi';
import rp from 'request-promise-native';

jest.mock('request-promise-native');
import { Http, HttpConfiguration } from './Http';
import { Container } from '../../../model/container';

const http = new Http();

const configurationValid: HttpConfiguration = {
    url: 'http://xxx.com',
    method: 'POST',
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
        http.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = http.validateConfiguration({
        url: configurationValid.url,
    } as HttpConfiguration);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    } as HttpConfiguration;
    expect(() => {
        http.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('trigger should send GET http request when configured like that', async () => {
    http.configuration = {
        method: 'GET',
        url: 'https:///test',
    } as HttpConfiguration;
    const container = {
        name: 'container1',
    } as Container;
    await http.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        qs: {
            name: 'container1',
        },
        method: 'GET',
        uri: 'https:///test',
        auth: undefined,
    });
});

test('trigger should send POST http request when configured like that', async () => {
    http.configuration = {
        method: 'POST',
        url: 'https:///test',
        auth: undefined,
    } as HttpConfiguration;
    const container = {
        name: 'container1',
    } as Container;
    await http.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            name: 'container1',
        },
        json: true,
        method: 'POST',
        uri: 'https:///test',
    });
});

test('trigger should use basic auth when configured like that', async () => {
    http.configuration = {
        url: 'https:///test',
        method: 'POST',
        auth: { type: 'BASIC', user: 'user', password: 'pass' },
    } as HttpConfiguration;
    const container = {
        name: 'container1',
    } as Container;
    await http.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            name: 'container1',
        },
        method: 'POST',
        json: true,
        uri: 'https:///test',
        auth: { user: 'user', pass: 'pass' },
    });
});

test('trigger should use bearer auth when configured like that', async () => {
    http.configuration = {
        url: 'https:///test',
        method: 'POST',
        auth: { type: 'BEARER', bearer: 'bearer' },
    } as HttpConfiguration;
    const container = {
        name: 'container1',
    } as Container;
    await http.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            name: 'container1',
        },
        method: 'POST',
        json: true,
        uri: 'https:///test',
        auth: { bearer: 'bearer' },
    });
});

test('trigger should use proxy when configured like that', async () => {
    http.configuration = {
        url: 'https:///test',
        method: 'POST',
        proxy: 'http://proxy:3128',
    } as HttpConfiguration;
    const container = {
        name: 'container1',
    } as Container;
    await http.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            name: 'container1',
        },
        method: 'POST',
        json: true,
        uri: 'https:///test',
        proxy: 'http://proxy:3128',
    });
});
