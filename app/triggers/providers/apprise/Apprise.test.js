const { ValidationError } = require('joi');
const rp = require('request-promise-native');

jest.mock('request-promise-native');
const Apprise = require('./Apprise');

const apprise = new Apprise();

const configurationValid = {
    url: 'http://xxx.com',
    urls: 'maito://user:pass@gmail.com',
    threshold: 'all',
    once: true,
    mode: 'simple',

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
        apprise.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        apprise.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('validateConfiguration should throw error when urls and config are set at the same time', () => {
    const configuration = {
        ...configurationValid,
        config: 'config',
    };
    expect(() => {
        apprise.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('trigger should send POST http request to notify endpoint', async () => {
    apprise.configuration = configurationValid;
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
    };
    await apprise.trigger(container);
    expect(rp).toHaveBeenCalledWith({
        body: {
            urls: 'maito://user:pass@gmail.com',
            title: 'New tag found for container container1',
            body: 'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n',
            format: 'text',
            type: 'info',
        },
        json: true,
        method: 'POST',
        uri: 'http://xxx.com/notify',
    });
});
