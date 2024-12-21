const { ValidationError } = require('joi');
const rp = require('request-promise-native');
const Ntfy = require('./Ntfy');

jest.mock('request-promise-native');

const ntfy = new Ntfy();

const configurationValid = {
    url: 'http://xxx.com',
    topic: 'xxx',
    priority: 2,
    mode: 'simple',
    threshold: 'all',
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
        ntfy.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        ntfy.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('trigger should call http client', async () => {
    ntfy.configuration = configurationValid;
    const container = {
        name: 'container1',
    };
    await ntfy.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            message:
                'Container container1 running with   can be updated to  \n',
            priority: 2,
            title: 'New  found for container container1',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        json: true,
        uri: 'http://xxx.com',
    });
});

test('trigger should use basic auth when configured like that', async () => {
    ntfy.configuration = {
        ...configurationValid,
        auth: { user: 'user', password: 'pass' },
    };
    const container = {
        name: 'container1',
    };
    await ntfy.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            message:
                'Container container1 running with   can be updated to  \n',
            priority: 2,
            title: 'New  found for container container1',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        json: true,
        uri: 'http://xxx.com',
        auth: { user: 'user', pass: 'pass' },
    });
});

test('trigger should use bearer auth when configured like that', async () => {
    ntfy.configuration = {
        ...configurationValid,
        auth: { token: 'token' },
    };
    const container = {
        name: 'container1',
    };
    await ntfy.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            message:
                'Container container1 running with   can be updated to  \n',
            priority: 2,
            title: 'New  found for container container1',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        json: true,
        uri: 'http://xxx.com',
        auth: { bearer: 'token' },
    });
});
