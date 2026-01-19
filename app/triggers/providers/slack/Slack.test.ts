// @ts-nocheck
import { ValidationError } from 'joi';
import { WebClient } from '@slack/web-api';

jest.mock('@slack/web-api');
import Slack from './Slack';

const slack = new Slack();

const configurationValid = {
    token: 'token',
    channel: 'channel',
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',

    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

    batchtitle: '${containers.length} updates available',
    disabletitle: false,
};

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        slack.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    expect(() => {
        slack.validateConfiguration({});
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', async () => {
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
        '*New tag found for container homeassistant*\n\nContainer homeassistant running with tag 1.0.0 can be updated to tag 2.0.0\nhttps://test-2.0.0/changelog',
    );
});

test('should send message with correct text', async () => {
    slack.configuration = {
        ...configurationValid,
        simpletitle: 'Test Title',
        simplebody: 'Test Body',
    };
    slack.sendMessage = jest.fn();
    await slack.trigger({});
    expect(slack.sendMessage).toHaveBeenCalledWith('*Test Title*\n\nTest Body');
});

test('disabletitle should result in no title in message', async () => {
    slack.configuration = {
        ...configurationValid,
        simpletitle: 'Test Title',
        simplebody: 'Test Body',
        disabletitle: true,
    };

    slack.sendMessage = jest.fn();
    await slack.trigger({});

    expect(slack.sendMessage).toHaveBeenCalledWith('Test Body');
});

test('triggerBatch should send batch notification', async () => {
    slack.configuration = configurationValid;
    slack.sendMessage = jest.fn();
    const containers = [
        {
            name: 'container1',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        },
        {
            name: 'container2',
            updateKind: {
                kind: 'tag',
                localValue: '1.1.0',
                remoteValue: '2.1.0',
            },
        },
    ];
    await slack.triggerBatch(containers);
    expect(slack.sendMessage).toHaveBeenCalledWith(
        '*2 updates available*\n\n- Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n\n- Container container2 running with tag 1.1.0 can be updated to tag 2.1.0\n',
    );
});
