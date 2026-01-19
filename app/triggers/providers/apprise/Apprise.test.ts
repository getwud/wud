// @ts-nocheck
import { ValidationError } from 'joi';
import axios from 'axios';

jest.mock('axios');
import Apprise from './Apprise';

const apprise = new Apprise();

const configurationValid = {
    url: 'http://xxx.com',
    urls: 'maito://user:pass@gmail.com',
    threshold: 'all',
    auto: true,
    once: true,
    mode: 'simple',

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
        apprise.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        apprise.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('validateConfiguration should throw error when urls and config are set at the same time', async () => {
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
    axios.mockResolvedValue({ data: {} });
    await apprise.trigger(container);
    expect(axios).toHaveBeenCalledWith({
        data: {
            urls: 'maito://user:pass@gmail.com',
            title: 'New tag found for container container1',
            data: 'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
            format: 'text',
            type: 'info',
        },

        method: 'POST',
        url: 'http://xxx.com/notify',
    });
});

test('trigger should use config and tag when configured', async () => {
    apprise.configuration = {
        url: 'http://xxx.com',
        config: 'myconfig',
        tag: 'mytag',
    };

    const container = {
        name: 'test',
        updateKind: { kind: 'tag', localValue: '1.0', remoteValue: '2.0' },
    };
    axios.mockResolvedValue({ data: {} });
    await apprise.trigger(container);

    expect(axios).toHaveBeenCalledWith({
        data: {
            title: expect.any(String),
            data: expect.any(String),
            format: 'text',
            type: 'info',
            tag: 'mytag',
        },

        method: 'POST',
        url: 'http://xxx.com/notify/myconfig',
    });
});

test('trigger should use config without tag', async () => {
    apprise.configuration = {
        url: 'http://xxx.com',
        config: 'myconfig',
    };

    const container = {
        name: 'test',
        updateKind: { kind: 'tag', localValue: '1.0', remoteValue: '2.0' },
    };
    axios.mockResolvedValue({ data: {} });
    await apprise.trigger(container);

    expect(axios).toHaveBeenCalledWith({
        data: {
            title: expect.any(String),
            data: expect.any(String),
            format: 'text',
            type: 'info',
        },

        method: 'POST',
        url: 'http://xxx.com/notify/myconfig',
    });
});

test('triggerBatch should send batch notification', async () => {
    apprise.configuration = {
        url: 'http://xxx.com',
        urls: 'mailto://test@example.com',
    };

    const containers = [
        {
            name: 'test1',
            updateKind: { kind: 'tag', localValue: '1.0', remoteValue: '2.0' },
        },
        {
            name: 'test2',
            updateKind: { kind: 'tag', localValue: '1.1', remoteValue: '2.1' },
        },
    ];

    axios.mockResolvedValue({ data: {} });
    await apprise.triggerBatch(containers);

    expect(axios).toHaveBeenCalledWith({
        data: {
            urls: 'mailto://test@example.com',
            title: expect.any(String),
            data: expect.any(String),
            format: 'text',
            type: 'info',
        },

        method: 'POST',
        url: 'http://xxx.com/notify',
    });
});

test('maskConfiguration should mask urls', async () => {
    apprise.configuration = {
        url: 'http://xxx.com',
        urls: 'mailto://secret@example.com',
    };

    const masked = apprise.maskConfiguration();

    expect(masked.url).toBe('http://xxx.com');
    expect(masked.urls).toBe('m*************************m');
});
