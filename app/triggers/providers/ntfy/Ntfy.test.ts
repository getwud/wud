// @ts-nocheck
import { ValidationError } from 'joi';
import axios from 'axios';
import Ntfy from './Ntfy';
import Trigger from '../Trigger';

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
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
        events: ['available'],
        successtitle: 'Update SUCCESS for ${container.name}',
        successbody:
            'Container ${container.name} has been successfully updated.',
        failuretitle: 'Update FAILED for ${container.name}',
        failurebody: 'Container ${container.name} update failed: ${error}',
        rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
    });
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

test('validateConfiguration should accept click option as string or uri', async () => {
    const validatedWithUrl = ntfy.validateConfiguration({
        ...configurationValid,
        click: 'https://example.com/app',
    });
    expect(validatedWithUrl.click).toEqual('https://example.com/app');

    const validatedWithTemplate = ntfy.validateConfiguration({
        ...configurationValid,
        click: '${link}',
    });
    expect(validatedWithTemplate.click).toEqual('${link}');

    const validatedWithEmpty = ntfy.validateConfiguration({
        ...configurationValid,
        click: '',
    });
    expect(validatedWithEmpty.click).toEqual('');
});

test('validateConfiguration should throw error when click is not a string', async () => {
    expect(() => {
        ntfy.validateConfiguration({
            ...configurationValid,
            click: 12345,
        });
    }).toThrowError(ValidationError);
});

test('trigger should include evaluated click in payload when configured with template', async () => {
    ntfy.configuration = {
        ...configurationValid,
        click: '${link}',
    };
    const container = {
        name: 'container1',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        result: {
            link: 'https://github.com/my/repo/releases/v2.0.0',
        },
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);
    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({
                click: 'https://github.com/my/repo/releases/v2.0.0',
            }),
        }),
    );
});

test('trigger should include static click url in payload when configured', async () => {
    ntfy.configuration = {
        ...configurationValid,
        click: 'https://dashboard.example.com',
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
    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({
                click: 'https://dashboard.example.com',
            }),
        }),
    );
});

test('trigger should omit click when template evaluates to empty string', async () => {
    ntfy.configuration = {
        ...configurationValid,
        click: '${link}',
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
    const sentData = axios.mock.calls[0][0].data;
    expect(sentData.click).toBeUndefined();
});

test('triggerBatch should include evaluated click in payload when configured', async () => {
    ntfy.configuration = {
        ...configurationValid,
        click: 'https://${hostname}.local/updates',
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
    const prevEnv = process.env.WUD_LOG_HOSTNAME;
    try {
        process.env.WUD_LOG_HOSTNAME = 'docker-host';
        axios.mockResolvedValue({ data: {} });
        await ntfy.triggerBatch(containers);
        expect(axios).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    click: 'https://docker-host.local/updates',
                }),
            }),
        );
    } finally {
        if (prevEnv === undefined) {
            delete process.env.WUD_LOG_HOSTNAME;
        } else {
            process.env.WUD_LOG_HOSTNAME = prevEnv;
        }
    }
});

test('triggerRollback should include click in payload when configured', async () => {
    ntfy.configuration = {
        ...configurationValid,
        click: '${link}',
    };
    const rollbackReport = {
        scope: 'container',
        container: {
            name: 'my-container',
            link: 'https://rollback-link.example.com',
        },
        status: 'succeeded',
        reason: 'healthcheck failed',
        oldImageRef: 'repo:1.0.0',
        newImageRef: 'repo:2.0.0',
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.triggerRollback(rollbackReport);
    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({
                click: 'https://rollback-link.example.com',
            }),
        }),
    );
});

test('triggerRollback should support static click url without container', async () => {
    ntfy.configuration = {
        ...configurationValid,
        click: 'https://status.example.com',
    };
    const rollbackReport = {
        scope: 'project',
        composeFile: 'docker-compose.yml',
        status: 'failed',
    };
    axios.mockResolvedValue({ data: {} });
    await ntfy.triggerRollback(rollbackReport);
    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({
                click: 'https://status.example.com',
            }),
        }),
    );
});

test('trigger without riskAnalysis should preserve legacy payload without actions or risk tags', async () => {
    ntfy.configuration = {
        ...configurationValid,
        priority: 2,
        tags: ['docker'],
    };

    const container = {
        name: 'legacy-app',
        updateKind: { kind: 'tag', localValue: '1.0.0', remoteValue: '1.1.0' },
        result: {},
    };

    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);

    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            data: {
                topic: 'xxx',
                title: 'New tag found for container legacy-app',
                message:
                    'Container legacy-app running with tag 1.0.0 can be updated to tag 1.1.0',
                priority: 2,
                tags: ['docker'],
            },
        }),
    );
});

test('trigger with riskAnalysis should adjust priority, add tags, action button, and breaking changes', async () => {
    ntfy.configuration = {
        ...configurationValid,
        priority: 2,
        tags: ['docker'],
    };

    const container = {
        id: 'c123',
        name: 'critical-app',
        updateKind: { kind: 'tag', localValue: '1.0.0', remoteValue: '2.0.0' },
        result: {
            changelogUrl: 'https://example.com/releases/v2.0.0',
            riskAnalysis: {
                riskScore: 'critical',
                skippedVersionsCount: 2,
                breakingChanges: ['Removed deprecated config key'],
                databaseImpact: 'Re-indexing required',
            },
        },
    };

    axios.mockResolvedValue({ data: {} });
    await ntfy.trigger(container);

    expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({
                priority: 5, // critical -> 5
                tags: expect.arrayContaining([
                    'docker',
                    'rotating_light',
                    'critical',
                ]),
                click: 'https://example.com/releases/v2.0.0',
                actions: [
                    {
                        action: 'view',
                        label: 'Review Update',
                        url: 'https://example.com/releases/v2.0.0',
                    },
                ],
                message: expect.stringContaining(
                    'Breaking Changes:\n• Removed deprecated config key',
                ),
            }),
        }),
    );
    const sentData = axios.mock.calls[0][0].data;
    expect(sentData.message).toContain('Skipped Releases: +2');
    expect(sentData.message).toContain('Database Impact: Re-indexing required');
});
