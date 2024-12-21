const { ValidationError } = require('joi');
const { WebClient } = require('@slack/web-api');

jest.mock('@slack/web-api');
const Slack = require('./Slack');

const slack = new Slack();

const configurationValid = {
    token: 'token',
    channel: 'channel',
    threshold: 'all',
    mode: 'simple',
    once: true,

    simpletitle: 'New ${kind} found for container ${name}',

    simplebody:
        'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',

    batchtitle: '${count} updates available',
};

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        slack.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    expect(() => {
        slack.validateConfiguration({});
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', () => {
    slack.configuration = {
        token: 'token',
        channel: 'channel',
    };
    expect(slack.maskConfiguration()).toEqual({
        token: 't***n',
        channel: 'channel',
    });
});

test('initTrigger should init Slack client', async () => {
    slack.configuration = configurationValid;
    await slack.initTrigger();
    expect(WebClient).toHaveBeenCalledWith('token');
});

test('trigger should format text as expected', async () => {
    slack.configuration = configurationValid;
    slack.client = {
        chat: {
            postMessage: (conf) => conf,
        },
    };
    const response = await slack.trigger({
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
            link: 'https://test-2.0.0/changelog',
        },
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    });
    expect(response.text).toEqual(
        'Container homeassistant running with tag 1.0.0 can be updated to tag 2.0.0\nhttps://test-2.0.0/changelog',
    );
});
