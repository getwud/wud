const { ValidationError } = require('joi');
const rp = require('request-promise-native');

jest.mock('request-promise-native');
const Http = require('./Http');

const http = new Http();

const configurationValid = {
    url: 'http://xxx.com',
    method: 'POST',
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
        http.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = http.validateConfiguration({
        url: configurationValid.url,
    });
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        http.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('trigger should send GET http request when configured like that', async () => {
    http.configuration = {
        method: 'GET',
        url: 'https:///test',
    };
    const container = {
        name: 'container1',
    };
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
    };
    const container = {
        name: 'container1',
    };
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
    };
    const container = {
        name: 'container1',
    };
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
    };
    const container = {
        name: 'container1',
    };
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
    };
    const container = {
        name: 'container1',
    };
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
