// @ts-nocheck
import { ValidationError } from 'joi';
import axios from 'axios';
import Ntfy from './Ntfy';

jest.mock('axios');

const ntfy = new Ntfy();

const configurationValid = {
    url: 'http://xxx.com',
    topic: 'xxx',
    priority: 2,
    tags: [],
    icon: '',
    mode: 'simple',
    threshold: 'all',
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
        ntfy.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should accept tags as array', async () => {
    const validatedConfiguration = ntfy.validateConfiguration({
        ...configurationValid,
        tags: ['tag1', 'tag2'],
    });
    expect(validatedConfiguration.tags).toEqual(['tag1', 'tag2']);
});

test('validateConfiguration should accept tags as comma-separated string', async () => {
    const validatedConfiguration = ntfy.validateConfiguration({
        ...configurationValid,
        tags: 'tag1, tag2, tag3',
    });
    expect(validatedConfiguration.tags).toEqual(['tag1', 'tag2', 'tag3']);
});

test('validateConfiguration should accept valid icon url', async () => {
    const validatedConfiguration = ntfy.validateConfiguration({
        ...configurationValid,
        icon: 'https://example.com/icon.png',
    });
    expect(validatedConfiguration.icon).toEqual('https://example.com/icon.png');
});

test('validateConfiguration should throw error when icon is invalid', async () => {
    expect(() => {
        ntfy.validateConfiguration({
            ...configurationValid,
            icon: 'not-a-valid-url',
        });
    }).toThrowError(ValidationError);

    expect(() => {
        ntfy.validateConfiguration({
            ...configurationValid,
            icon: 'ftp://example.com/icon.png',
        });
    }).toThrowError(ValidationError);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        ntfy.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('maskConfiguration should mask sensitive data', async () => {
    ntfy.configuration = {
        auth: {
            user: 'user',
            password: 'password',
            token: 'token',
        },
    };
    expect(ntfy.maskConfiguration()).toEqual({
        auth: {
            user: 'u**r',
            password: 'p******d',
            token: 't***n',
        },
    });
});

test('trigger should call http client', async () => {
    ntfy.configuration = configurationValid;
    const container = {
        name: 'container1',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);
    expect(axios).toHaveBeenCalledWith({
        data: {
            message:
                'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
            priority: 2,
            title: 'New tag found for container container1',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',

        url: 'http://xxx.com',
    });
});

test('trigger should use basic auth when configured like that', async () => {
    ntfy.configuration = {
        ...configurationValid,
        auth: { user: 'user', password: 'pass' },
    };
    const container = {
        name: 'container1',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);
    expect(axios).toHaveBeenCalledWith({
        data: {
            message:
                'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
            priority: 2,
            title: 'New tag found for container container1',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',

        url: 'http://xxx.com',
        auth: { username: 'user', password: 'pass' },
    });
});

test('trigger should use bearer auth when configured like that', async () => {
    ntfy.configuration = {
        ...configurationValid,
        auth: { token: 'token' },
    };
    const container = {
        name: 'container1',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);
    expect(axios).toHaveBeenCalledWith({
        data: {
            message:
                'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
            priority: 2,
            title: 'New tag found for container container1',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
        },
        method: 'POST',
        url: 'http://xxx.com',
    });
});

test('trigger should include tags and icon in payload when configured', async () => {
    ntfy.configuration = {
        ...configurationValid,
        tags: ['tag1', 'tag2'],
        icon: 'https://example.com/icon.png',
    };
    const container = {
        name: 'container1',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);
    expect(axios).toHaveBeenCalledWith({
        data: {
            message:
                'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
            priority: 2,
            title: 'New tag found for container container1',
            topic: 'xxx',
            tags: ['tag1', 'tag2'],
            icon: 'https://example.com/icon.png',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        url: 'http://xxx.com',
    });
});

test('triggerBatch should call http client without tags and icon when not configured', async () => {
    ntfy.configuration = configurationValid;
    const containers = [
        {
            name: 'container1',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        },
    ];
    axios.mockResolvedValue({ data: {} });
    await ntfy.triggerBatch(containers);
    expect(axios).toHaveBeenCalledWith({
        data: {
            message:
                '- Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n',
            priority: 2,
            title: '1 updates available',
            topic: 'xxx',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        url: 'http://xxx.com',
    });
});

test('triggerBatch should call http client with tags and icon when configured', async () => {
    ntfy.configuration = {
        ...configurationValid,
        tags: ['tag1', 'tag2'],
        icon: 'https://example.com/icon.png',
    };
    const containers = [
        {
            name: 'container1',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        },
    ];
    axios.mockResolvedValue({ data: {} });
    await ntfy.triggerBatch(containers);
    expect(axios).toHaveBeenCalledWith({
        data: {
            message:
                '- Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n',
            priority: 2,
            title: '1 updates available',
            topic: 'xxx',
            tags: ['tag1', 'tag2'],
            icon: 'https://example.com/icon.png',
        },
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        url: 'http://xxx.com',
    });
});
