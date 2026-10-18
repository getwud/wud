// @ts-nocheck
import { ValidationError } from 'joi';

jest.mock(
    'pushover-notifications',
    () =>
        class Push {
            send(message, cb) {
                cb(undefined, message);
            }
        },
);

import Pushover from './Pushover';
import { testTriggerProvider } from '../TriggerTestHelper';
import Trigger from '../Trigger';

const pushover = new Pushover();

const configurationValid = {
    user: 'user',
    token: 'token',
    priority: 0,
    sound: 'pushover',
    html: 0,
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

testTriggerProvider(Pushover, configurationValid);

test('validateConfiguration should fail when priority is 2 and no retry set', async () => {
    expect(() => {
        pushover.validateConfiguration({
            ...configurationValid,
            priority: 2,
        });
    }).toThrowError(ValidationError);
});

test('validateConfiguration should fail when priority is 2 and retry too small', async () => {
    expect(() => {
        pushover.validateConfiguration({
            ...configurationValid,
            priority: 2,
            retry: 10,
        });
    }).toThrowError(ValidationError);
});

test('validateConfiguration should fail when priority is 2 and no expire', async () => {
    expect(() => {
        pushover.validateConfiguration({
            ...configurationValid,
            priority: 2,
            retry: 100,
        });
    }).toThrowError(ValidationError);
});

test('validateConfiguration should succeed when priority is 2 and expire and retry set', async () => {
    expect({
        ...configurationValid,
        priority: 2,
        retry: 100,
        expire: 200,
    }).toStrictEqual({
        ...configurationValid,
        priority: 2,
        retry: 100,
        expire: 200,
    });
});

test('validateConfiguration should apply_default_configuration', async () => {
    const validatedConfiguration = pushover.validateConfiguration({
        user: configurationValid.user,
        token: configurationValid.token,
    });
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

test('maskConfiguration should mask sensitive data', async () => {
    pushover.configuration = configurationValid;
    expect(pushover.maskConfiguration()).toEqual({
        mode: 'simple',
        priority: 0,
        device: undefined,
        auto: true,
        simplebody:
            'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

        simpletitle:
            'New ${container.updateKind.kind} found for container ${container.name}',

        batchtitle: '${containers.length} updates available',
        sound: 'pushover',
        html: 0,
        threshold: 'all',
        once: true,
        token: 't***n',
        user: 'u**r',
    });
});

test('trigger should send message to pushover', async () => {
    pushover.configuration = {
        ...configurationValid,
    };
    const container = {
        name: 'container1',
        image: {
            name: 'imageName',
            tag: {
                value: '1.0.0',
            },
            digest: {
                value: '123456789',
            },
        },
        result: {
            tag: '2.0.0',
        },
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
            semverDiff: 'major',
        },
    };
    const result = await pushover.trigger(container);
    expect(result).toStrictEqual({
        device: undefined,
        message:
            'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
        priority: 0,
        sound: 'pushover',
        html: 0,
        title: 'New tag found for container container1',
    });
});

test('triggerBatch should send batch notification', async () => {
    pushover.configuration = configurationValid;
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
    const result = await pushover.triggerBatch(containers);
    expect(result).toStrictEqual({
        device: undefined,
        message:
            '- Container container1 running with tag 1.0.0 can be updated to tag 2.0.0\n- Container container2 running with tag 1.1.0 can be updated to tag 2.1.0',
        priority: 0,
        sound: 'pushover',
        html: 0,
        title: '2 updates available',
    });
});

test('trigger with riskAnalysis should set priority 1 for high risk, url, and text details', async () => {
    pushover.configuration = {
        ...configurationValid,
        html: 0,
    };
    const container = {
        id: 'c123',
        name: 'app-db',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        result: {
            changelogUrl: 'https://example.com/changelog',
            riskAnalysis: {
                riskScore: 'high',
                summary: 'Database upgrade with schema change',
                skippedVersionsCount: 2,
                breakingChanges: ['Column dropped'],
                databaseImpact: 'Migration required',
            },
        },
    };
    const result = (await pushover.trigger(container)) as any;
    expect(result.priority).toBe(1);
    expect(result.url).toBe('https://example.com/changelog');
    expect(result.url_title).toBe('Review Update in WUD');
    expect(result.message).toContain('Risk Level: ⚡ HIGH');
    expect(result.message).toContain('Skipped Versions: +2');
    expect(result.message).toContain(
        'Summary: Database upgrade with schema change',
    );
    expect(result.message).toContain('Breaking Changes:\n• Column dropped');
    expect(result.message).toContain('DB Impact: Migration required');
});

test('trigger with riskAnalysis and html enabled should format with HTML tags', async () => {
    pushover.configuration = {
        ...configurationValid,
        html: 1,
    };
    const container = {
        id: 'c123',
        name: 'app-db',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        result: {
            changelogUrl: 'https://example.com/changelog',
            riskAnalysis: {
                riskScore: 'critical',
                skippedVersionsCount: 1,
                breakingChanges: ['Breaking auth'],
            },
        },
    };
    const result = (await pushover.trigger(container)) as any;
    expect(result.priority).toBe(1);
    expect(result.html).toBe(1);
    expect(result.message).toContain('<b>Risk Level:</b> 🚨 CRITICAL');
    expect(result.message).toContain('<b>Skipped Versions:</b> +1');
    expect(result.message).toContain(
        '<b>Breaking Changes:</b><br/>• Breaking auth',
    );
});
