// @ts-nocheck
import { ValidationError } from 'joi';
import * as event from '../../event';
import log from '../../log';
import Trigger from './Trigger';

jest.mock('../../log');
jest.mock('../../event');
jest.mock('../../prometheus/trigger', () => ({
    getTriggerCounter: () => ({
        inc: () => ({}),
    }),
}));

let trigger;

const configurationValid = {
    threshold: 'all',
    once: true,
    mode: 'simple',
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',

    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

    batchtitle: '${containers.length} updates available',
    includebydefault: true,
    ondigest: true,
};

beforeEach(async () => {
    jest.resetAllMocks();
    trigger = new Trigger();
    trigger.log = log;
    trigger.configuration = { ...configurationValid };
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        trigger.validateConfiguration(configurationValid);
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

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        trigger.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('init should register to container report when simple mode enabled', async () => {
    const spy = jest.spyOn(event, 'registerContainerReport');
    await trigger.init();
    expect(spy).toHaveBeenCalled();
});

test('init should register to container reports when batch mode enabled', async () => {
    const spy = jest.spyOn(event, 'registerContainerReports');
    trigger.configuration.mode = 'batch';
    await trigger.init();
    expect(spy).toHaveBeenCalled();
});

const handleContainerReportTestCases = [
    {
        shouldTrigger: true,
        threshold: 'all',
        once: true,
        changed: true,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: true,
        threshold: 'all',
        once: false,
        changed: false,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'minor',
        once: true,
        changed: true,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'minor',
        once: false,
        changed: false,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'minor',
        once: false,
        changed: true,
        updateAvailable: false,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'all',
        once: false,
        changed: false,
        updateAvailable: true,
        semverDiff: 'major',
        error: { message: 'Registry error' },
    },
];

test.each(handleContainerReportTestCases)(
    'handleContainerReport should call trigger? ($shouldTrigger) when changed=$changed and updateAvailable=$updateAvailable and threshold=$threshold',
    async (item) => {
        trigger.configuration = {
            threshold: item.threshold,
            once: item.once,
            mode: 'simple',
        };
        await trigger.init();

        const spy = jest.spyOn(trigger, 'trigger');
        await trigger.handleContainerReport({
            changed: item.changed,
            container: {
                name: 'container1',
                updateAvailable: item.updateAvailable,
                updateKind: {
                    kind: 'tag',
                    semverDiff: item.semverDiff,
                },
                ...(item.error && { error: item.error }),
            },
        });
        if (item.shouldTrigger) {
            expect(spy).toHaveBeenCalledWith({
                name: 'container1',
                updateAvailable: item.updateAvailable,
                updateKind: {
                    kind: 'tag',
                    semverDiff: item.semverDiff,
                },
            });
        } else {
            expect(spy).not.toHaveBeenCalled();
        }
    },
);

test('handleContainerReport should warn when trigger method of the trigger fails', async () => {
    trigger.configuration = {
        threshold: 'all',
        mode: 'simple',
    };
    trigger.trigger = () => {
        throw new Error('Fail!!!');
    };
    await trigger.init();
    const spyLog = jest.spyOn(log, 'warn');
    await trigger.handleContainerReport({
        changed: true,
        container: {
            name: 'container1',
            updateAvailable: true,
        },
    });
    expect(spyLog).toHaveBeenCalledWith('Error (Fail!!!)');
});

const handleContainerReportsTestCases = [
    {
        shouldTrigger: true,
        threshold: 'all',
        once: true,
        changed: true,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: true,
        threshold: 'all',
        once: false,
        changed: false,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'minor',
        once: true,
        changed: true,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'minor',
        once: false,
        changed: false,
        updateAvailable: true,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'minor',
        once: false,
        changed: true,
        updateAvailable: false,
        semverDiff: 'major',
    },
    {
        shouldTrigger: false,
        threshold: 'all',
        once: false,
        changed: false,
        updateAvailable: true,
        semverDiff: 'major',
        error: { message: 'Registry error' },
    },
];

test.each(handleContainerReportsTestCases)(
    'handleContainerReports should call triggerBatch? ($shouldTrigger) when changed=$changed and updateAvailable=$updateAvailable and threshold=$threshold',
    async (item) => {
        trigger.configuration = {
            threshold: item.threshold,
            once: item.once,
            mode: 'simple',
        };
        await trigger.init();

        const spy = jest.spyOn(trigger, 'triggerBatch');
        await trigger.handleContainerReports([
            {
                changed: item.changed,
                container: {
                    name: 'container1',
                    updateAvailable: item.updateAvailable,
                    updateKind: {
                        kind: 'tag',
                        semverDiff: item.semverDiff,
                    },
                    ...(item.error && { error: item.error }),
                },
            },
        ]);
        if (item.shouldTrigger) {
            expect(spy).toHaveBeenCalledWith([
                {
                    name: 'container1',
                    updateAvailable: item.updateAvailable,
                    updateKind: {
                        kind: 'tag',
                        semverDiff: item.semverDiff,
                    },
                },
            ]);
        } else {
            expect(spy).not.toHaveBeenCalled();
        }
    },
);

const isThresholdReachedTestCases = [
    {
        result: true,
        threshold: 'all',
        change: undefined,
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'major',
        change: 'major',
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'major',
        change: 'minor',
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'major',
        change: 'patch',
        kind: 'tag',
    },
    {
        result: false,
        threshold: 'minor',
        change: 'major',
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'minor',
        change: 'minor',
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'minor',
        change: 'patch',
        kind: 'tag',
    },
    {
        result: false,
        threshold: 'patch',
        change: 'major',
        kind: 'tag',
    },
    {
        result: false,
        threshold: 'patch',
        change: 'minor',
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'patch',
        change: 'patch',
        kind: 'tag',
    },
    {
        result: true,
        threshold: 'all',
        change: 'unknown',
        kind: 'digest',
    },
    {
        result: true,
        threshold: 'major',
        change: 'unknown',
        kind: 'digest',
    },
    {
        result: true,
        threshold: 'minor',
        change: 'unknown',
        kind: 'digest',
    },
    {
        result: true,
        threshold: 'patch',
        change: 'unknown',
        kind: 'digest',
    },
];

test.each(isThresholdReachedTestCases)(
    'isThresholdReached should return $result when threshold is $threshold and change is $change',
    (item) => {
        trigger.configuration = {
            threshold: item.threshold,
        };
        expect(
            Trigger.isThresholdReached(
                {
                    updateKind: {
                        kind: item.kind,
                        semverDiff: item.change,
                    },
                },
                trigger.configuration.threshold,
            ),
        ).toEqual(item.result);
    },
);

test('isThresholdReached should return true when there is no semverDiff regardless of the threshold', async () => {
    trigger.configuration = {
        threshold: 'all',
    };
    expect(
        Trigger.isThresholdReached(
            {
                updateKind: { kind: 'digest' },
            },
            trigger.configuration.threshold,
        ),
    ).toBeTruthy();
});

test('mustTrigger should include containers without trigger include label by default', async () => {
    trigger.type = 'smtp';
    trigger.name = 'gmail';
    delete trigger.configuration.includebydefault;

    expect(trigger.mustTrigger({})).toBeTruthy();
});

test('mustTrigger should ignore containers without trigger include label when include by default is disabled', async () => {
    trigger.type = 'dockercompose';
    trigger.name = 'local';
    trigger.configuration.includebydefault = false;

    expect(trigger.mustTrigger({})).toBeFalsy();
});

test('mustTrigger should include explicitly selected containers when include by default is disabled', async () => {
    trigger.type = 'dockercompose';
    trigger.name = 'local';
    trigger.configuration.includebydefault = false;

    expect(
        trigger.mustTrigger({
            triggerInclude: 'dockercompose.local',
        }),
    ).toBeTruthy();
});

test('mustTrigger should still honor trigger exclude when include by default is enabled', async () => {
    trigger.type = 'dockercompose';
    trigger.name = 'local';
    trigger.configuration.includebydefault = true;

    expect(
        trigger.mustTrigger({
            triggerExclude: 'dockercompose.local',
        }),
    ).toBeFalsy();
});

test('renderTemplate should replace placeholders when called', () => {
    expect(
        trigger.renderTemplate('Hello ${name} on ${watcher}', {
            name: 'my-app',
            watcher: 'local',
        }),
    ).toEqual('Hello my-app on local');
});

test('renderSimpleTitle should replace placeholders when called', async () => {
    expect(
        trigger.renderSimpleTitle({
            name: 'container-name',
            updateKind: {
                kind: 'tag',
            },
        }),
    ).toEqual('New tag found for container container-name');
});

test('renderSimpleBody should replace placeholders when called', async () => {
    expect(
        trigger.renderSimpleBody({
            name: 'container-name',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
            result: {
                link: 'http://test',
            },
        }),
    ).toEqual(
        'Container container-name running with tag 1.0.0 can be updated to tag 2.0.0\nhttp://test',
    );
});

test('renderSimpleBody should replace placeholders when template is a customized one', async () => {
    trigger.configuration.simplebody =
        'Watcher ${watcher} reports container ${name} available update';
    expect(
        trigger.renderSimpleBody({
            name: 'container-name',
            watcher: 'DUMMY',
        }),
    ).toEqual(
        'Watcher DUMMY reports container container-name available update',
    );
});

test('renderSimpleBody should evaluate js functions when template is a customized one', async () => {
    trigger.configuration.simplebody =
        'Container ${name} update from ${local.substring(0, 15)} to ${remote.substring(0, 15)}';
    expect(
        trigger.renderSimpleBody({
            name: 'container-name',
            updateKind: {
                kind: 'digest',
                localValue:
                    'sha256:9a82d5773ccfcb73ba341619fd44790a30750731568c25a6e070c2c44aa30bde',
                remoteValue:
                    'sha256:6cdd479147e4d2f1f853c7205ead7e2a0b0ccbad6e3ff0986e01936cbd179c17',
            },
        }),
    ).toEqual(
        'Container container-name update from sha256:9a82d577 to sha256:6cdd4791',
    );
});

test('renderBatchTitle should replace placeholders when called', async () => {
    expect(
        trigger.renderBatchTitle([
            {
                name: 'container-name',
                updateKind: {
                    kind: 'tag',
                },
            },
        ]),
    ).toEqual('1 updates available');
});

test('renderBatchBody should replace placeholders when called', async () => {
    expect(
        trigger.renderBatchBody([
            {
                name: 'container-name',
                updateKind: {
                    kind: 'tag',
                    localValue: '1.0.0',
                    remoteValue: '2.0.0',
                },
                result: {
                    link: 'http://test',
                },
            },
        ]),
    ).toEqual(
        '- Container container-name running with tag 1.0.0 can be updated to tag 2.0.0\nhttp://test\n',
    );
});

test('validateConfiguration should accept ondigest option', async () => {
    const validatedConfiguration = trigger.validateConfiguration({});
    expect(validatedConfiguration.ondigest).toBeUndefined();

    const validatedWithFalse = trigger.validateConfiguration({
        ondigest: false,
    });
    expect(validatedWithFalse.ondigest).toBe(false);

    const validatedWithTrue = trigger.validateConfiguration({
        ondigest: true,
    });
    expect(validatedWithTrue.ondigest).toBe(true);
});

test('mustTrigger should return false for digest update when ondigest is false', async () => {
    trigger.configuration.ondigest = false;
    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'digest',
                localValue: 'sha256:111',
                remoteValue: 'sha256:222',
            },
        }),
    ).toBe(false);
});

test('mustTrigger should return true for tag update when ondigest is false', async () => {
    trigger.configuration.ondigest = false;
    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        }),
    ).toBe(true);
});

test('mustTrigger should return true for digest update when ondigest is true', async () => {
    trigger.configuration.ondigest = true;
    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'digest',
                localValue: 'sha256:111',
                remoteValue: 'sha256:222',
            },
        }),
    ).toBe(true);
});

test('mustTrigger should allow overriding ondigest via specific container label', async () => {
    trigger.type = 'mock';
    trigger.name = 'trigger1';
    trigger.configuration.ondigest = false;

    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'digest',
            },
            labels: {
                'wud.trigger.mock.trigger1.ondigest': 'true',
            },
        }),
    ).toBe(true);

    trigger.configuration.ondigest = true;
    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'digest',
            },
            labels: {
                'wud.trigger.mock.trigger1.ondigest': 'false',
            },
        }),
    ).toBe(false);
});

test('mustTrigger should allow overriding ondigest via type container label', async () => {
    trigger.type = 'mock';
    trigger.name = 'trigger1';
    trigger.configuration.ondigest = false;

    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'digest',
            },
            labels: {
                'wud.trigger.mock.ondigest': 'true',
            },
        }),
    ).toBe(true);
});

test('mustTrigger should allow overriding ondigest via generic container label', async () => {
    trigger.type = 'mock';
    trigger.name = 'trigger1';
    trigger.configuration.ondigest = false;

    expect(
        trigger.mustTrigger({
            name: 'container1',
            updateKind: {
                kind: 'digest',
            },
            labels: {
                'wud.trigger.ondigest': 'true',
            },
        }),
    ).toBe(true);
});

test('handleContainerReport should ignore digest update and log debug when ondigest is false', async () => {
    trigger.configuration.ondigest = false;
    const triggerSpy = jest.spyOn(trigger, 'trigger');
    const debugSpy = jest.fn();
    trigger.log = {
        ...log,
        child: () => ({
            debug: debugSpy,
            warn: jest.fn(),
        }),
    };

    await trigger.handleContainerReport({
        changed: true,
        container: {
            name: 'container1',
            updateAvailable: true,
            updateKind: {
                kind: 'digest',
            },
        },
    });

    expect(triggerSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
        'Digest update ignored because ondigest is disabled',
    );
});

test('handleContainerReports should filter out digest updates when ondigest is false in batch mode', async () => {
    trigger.configuration.ondigest = false;
    const triggerBatchSpy = jest.spyOn(trigger, 'triggerBatch');

    const digestContainer = {
        name: 'container-digest',
        updateAvailable: true,
        updateKind: {
            kind: 'digest',
        },
    };
    const tagContainer = {
        name: 'container-tag',
        updateAvailable: true,
        updateKind: {
            kind: 'tag',
        },
    };

    await trigger.handleContainerReports([
        {
            changed: true,
            container: digestContainer,
        },
        {
            changed: true,
            container: tagContainer,
        },
    ]);

    expect(triggerBatchSpy).toHaveBeenCalledWith([tagContainer]);
});

describe('rollback notifications', () => {
    test('triggerRollback should be a no-op by default', async () => {
        const report = {
            scope: 'container',
            container: { name: 'test' },
            status: 'succeeded',
        };
        await expect(trigger.triggerRollback(report)).resolves.toBeUndefined();
    });

    test('supportsRollbackNotifications should be false by default', () => {
        expect(trigger.supportsRollbackNotifications()).toBe(false);
    });

    test('supportsRollbackNotifications should be false for mutating triggers', () => {
        const mutating = new Trigger();
        mutating.type = 'docker';
        expect(mutating.supportsRollbackNotifications()).toBe(false);
    });

    test('renderRollbackTitle/Body should fall back to the historic strings', () => {
        trigger.configuration = {};
        const report = {
            scope: 'container',
            container: { name: 'web' },
            oldImageRef: 'test/web:1.0.0',
            newImageRef: 'test/web:2.0.0',
            reason: 'unhealthy',
            status: 'succeeded',
        };
        expect(trigger.renderRollbackTitle(report)).toBe(
            'Rollback of web (unhealthy)',
        );
        expect(trigger.renderRollbackBody(report)).toBe(
            'Container web was rolled back from test/web:2.0.0 to test/web:1.0.0 (reason: unhealthy).',
        );
    });

    test('rollback templates should render byte-identical default output', () => {
        const validated = trigger.validateConfiguration({});
        trigger.configuration = validated;
        const success = {
            scope: 'container',
            container: { name: 'web' },
            oldImageRef: 'test/web:1.0.0',
            newImageRef: 'test/web:2.0.0',
            reason: 'unhealthy',
            status: 'succeeded',
        };
        expect(trigger.renderRollbackTitle(success)).toBe(
            'Rollback of web (unhealthy)',
        );
        expect(trigger.renderRollbackBody(success)).toBe(
            'Container web was rolled back from test/web:2.0.0 to test/web:1.0.0 (reason: unhealthy).',
        );

        const failed = {
            scope: 'container',
            container: { name: 'web' },
            status: 'failed',
            error: { step: 'S3', message: 'rename failed' },
            archiveName: 'web-wud-old-123',
        };
        expect(trigger.renderRollbackTitle(failed)).toBe(
            'Rollback FAILED for web',
        );
        expect(trigger.renderRollbackBody(failed)).toBe(
            'Rollback of web failed at step S3: rename failed\nThe previous container is kept as web-wud-old-123 for manual recovery.',
        );
    });

    test('rollback templates should be overridable via configuration', () => {
        trigger.configuration = {
            rollbacktitle: 'RB ${status} ${name}',
            rollbackbody:
                'old=${oldImageRef} new=${newImageRef} reason=${reason}',
        };
        const report = {
            scope: 'container',
            container: { name: 'web' },
            oldImageRef: 'test/web:1.0.0',
            newImageRef: 'test/web:2.0.0',
            reason: 'unhealthy',
            status: 'succeeded',
        };
        expect(trigger.renderRollbackTitle(report)).toBe('RB succeeded web');
        expect(trigger.renderRollbackBody(report)).toBe(
            'old=test/web:1.0.0 new=test/web:2.0.0 reason=unhealthy',
        );
    });

    test('handleContainerRollback should forward the report to triggerRollback', async () => {
        trigger.type = 'slack';
        const spy = jest
            .spyOn(trigger, 'triggerRollback')
            .mockResolvedValue(undefined);
        const report = {
            scope: 'container',
            container: { name: 'test' },
            status: 'succeeded',
        };
        await trigger.handleContainerRollback(report);
        expect(spy).toHaveBeenCalledWith(report);
    });

    test('handleContainerRollback should swallow notification errors', async () => {
        trigger.type = 'slack';
        jest.spyOn(trigger, 'triggerRollback').mockRejectedValue(
            new Error('boom'),
        );
        await expect(
            trigger.handleContainerRollback({
                scope: 'container',
                status: 'succeeded',
            }),
        ).resolves.toBeUndefined();
    });

    test('renderRollbackTitle/Body should describe a successful rollback', () => {
        const report = {
            scope: 'container',
            container: { name: 'web' },
            oldImageRef: 'test/web:1.0.0',
            newImageRef: 'test/web:2.0.0',
            reason: 'unhealthy',
            status: 'succeeded',
        };
        expect(trigger.renderRollbackTitle(report)).toContain('web');
        expect(trigger.renderRollbackBody(report)).toContain('test/web:1.0.0');
        expect(trigger.renderRollbackBody(report)).toContain('unhealthy');
    });

    test('renderRollbackTitle/Body should describe a failed rollback', () => {
        const report = {
            scope: 'container',
            container: { name: 'web' },
            status: 'failed',
            error: { step: 'S3', message: 'rename failed' },
            archiveName: 'web-wud-old-123',
        };
        expect(trigger.renderRollbackTitle(report)).toContain('FAILED');
        expect(trigger.renderRollbackBody(report)).toContain('S3');
        expect(trigger.renderRollbackBody(report)).toContain('web-wud-old-123');
    });
});

describe('granular per-trigger labels (fixes #691)', () => {
    test('Case 1: targeted activation of auto-update trigger with includebydefault=false while default notification triggers still fire', () => {
        // Trigger 1: docker.autoupdate (includebydefault: false)
        const autoUpdateTrigger = new Trigger();
        autoUpdateTrigger.type = 'docker';
        autoUpdateTrigger.name = 'autoupdate';
        autoUpdateTrigger.configuration = { includebydefault: false };

        // Trigger 2: telegram.notify (includebydefault: true)
        const notifyTrigger = new Trigger();
        notifyTrigger.type = 'telegram';
        notifyTrigger.name = 'notify';
        notifyTrigger.configuration = { includebydefault: true };

        const container = {
            name: 'my-app',
            labels: {
                'wud.trigger.docker.autoupdate.enabled': 'true',
            },
        };

        expect(autoUpdateTrigger.isTriggerEnabled(container)).toBe(true);
        expect(autoUpdateTrigger.mustTrigger(container)).toBe(true);

        expect(notifyTrigger.isTriggerEnabled(container)).toBe(true);
        expect(notifyTrigger.mustTrigger(container)).toBe(true);
    });

    test('Case 2: targeted deactivation of default trigger (wud.trigger.telegram.notify.enabled=false)', () => {
        const notifyTrigger = new Trigger();
        notifyTrigger.type = 'telegram';
        notifyTrigger.name = 'notify';
        notifyTrigger.configuration = { includebydefault: true };

        const otherTrigger = new Trigger();
        otherTrigger.type = 'smtp';
        otherTrigger.name = 'mail';
        otherTrigger.configuration = { includebydefault: true };

        const container = {
            name: 'my-app',
            labels: {
                'wud.trigger.telegram.notify.enabled': 'false',
            },
        };

        expect(notifyTrigger.isTriggerEnabled(container)).toBe(false);
        expect(notifyTrigger.mustTrigger(container)).toBe(false);

        expect(otherTrigger.isTriggerEnabled(container)).toBe(true);
        expect(otherTrigger.mustTrigger(container)).toBe(true);
    });

    describe('Case 3: precedence instance (<type>.<name>) > type (<type>) > global include/exclude > includebydefault', () => {
        test('instance=true overrides type=false', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            const container = {
                labels: {
                    'wud.trigger.docker.enabled': 'false',
                    'wud.trigger.docker.autoupdate.enabled': 'true',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(true);
        });

        test('instance=false overrides type=true', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            const container = {
                labels: {
                    'wud.trigger.docker.enabled': 'true',
                    'wud.trigger.docker.autoupdate.enabled': 'false',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(false);
        });

        test('instance=true overrides global triggerExclude', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: true };

            const container = {
                triggerExclude: 'docker.autoupdate',
                labels: {
                    'wud.trigger.docker.autoupdate.enabled': 'true',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(true);
        });

        test('instance=false overrides global triggerInclude', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            const container = {
                triggerInclude: 'docker.autoupdate',
                labels: {
                    'wud.trigger.docker.autoupdate.enabled': 'false',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(false);
        });

        test('type=true overrides global triggerExclude', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: true };

            const container = {
                triggerExclude: 'docker.autoupdate',
                labels: {
                    'wud.trigger.docker.enabled': 'true',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(true);
        });

        test('type=false overrides global triggerInclude', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            const container = {
                triggerInclude: 'docker.autoupdate',
                labels: {
                    'wud.trigger.docker.enabled': 'false',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(false);
        });

        test('global triggerInclude / triggerExclude overrides includebydefault', () => {
            const trInclude = new Trigger();
            trInclude.type = 'docker';
            trInclude.name = 'autoupdate';
            trInclude.configuration = { includebydefault: false };

            const trExclude = new Trigger();
            trExclude.type = 'telegram';
            trExclude.name = 'notify';
            trExclude.configuration = { includebydefault: true };

            const container = {
                triggerInclude: 'docker.autoupdate',
                triggerExclude: 'telegram.notify',
            };

            expect(trInclude.isTriggerEnabled(container)).toBe(true);
            expect(trExclude.isTriggerEnabled(container)).toBe(false);
        });

        test('falls back to includebydefault when no labels or include/exclude match', () => {
            const trDefaultTrue = new Trigger();
            trDefaultTrue.type = 'telegram';
            trDefaultTrue.name = 'notify';
            trDefaultTrue.configuration = { includebydefault: true };

            const trDefaultFalse = new Trigger();
            trDefaultFalse.type = 'docker';
            trDefaultFalse.name = 'autoupdate';
            trDefaultFalse.configuration = { includebydefault: false };

            const container = {};

            expect(trDefaultTrue.isTriggerEnabled(container)).toBe(true);
            expect(trDefaultFalse.isTriggerEnabled(container)).toBe(false);
        });
    });

    describe('Case 4: strict backward compatibility with wud.trigger.include / exclude allowlist', () => {
        test('triggerInclude exclusively includes specified trigger and excludes others', () => {
            const trIncluded = new Trigger();
            trIncluded.type = 'dockercompose';
            trIncluded.name = 'local';
            trIncluded.configuration = { includebydefault: false };

            const trOther = new Trigger();
            trOther.type = 'telegram';
            trOther.name = 'notify';
            trOther.configuration = { includebydefault: true };

            const container = {
                triggerInclude: 'dockercompose.local',
            };

            expect(trIncluded.isTriggerEnabled(container)).toBe(true);
            expect(trOther.isTriggerEnabled(container)).toBe(false);
        });

        test('triggerExclude excludes specified trigger while others remain enabled', () => {
            const trExcluded = new Trigger();
            trExcluded.type = 'dockercompose';
            trExcluded.name = 'local';
            trExcluded.configuration = { includebydefault: true };

            const trOther = new Trigger();
            trOther.type = 'telegram';
            trOther.name = 'notify';
            trOther.configuration = { includebydefault: true };

            const container = {
                triggerExclude: 'dockercompose.local',
            };

            expect(trExcluded.isTriggerEnabled(container)).toBe(false);
            expect(trOther.isTriggerEnabled(container)).toBe(true);
        });

        test('honors threshold on triggerInclude', () => {
            const tr = new Trigger();
            tr.type = 'dockercompose';
            tr.name = 'local';
            tr.configuration = { includebydefault: false };

            const containerPatch = {
                triggerInclude: 'dockercompose.local:patch',
                updateKind: { kind: 'tag', semverDiff: 'minor' },
            };
            const containerMatch = {
                triggerInclude: 'dockercompose.local:minor',
                updateKind: { kind: 'tag', semverDiff: 'minor' },
            };

            expect(tr.isTriggerEnabled(containerPatch)).toBe(false);
            expect(tr.isTriggerEnabled(containerMatch)).toBe(true);
        });
    });

    describe('label prefix support (canonical getwud.app/, wud., unprefixed)', () => {
        test('supports getwud.app/ prefix', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            const container = {
                labels: {
                    'getwud.app/trigger.docker.autoupdate.enabled': 'true',
                },
            };

            expect(tr.isTriggerEnabled(container)).toBe(true);
        });

        test('supports boolean values (true / false)', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            expect(
                tr.isTriggerEnabled({
                    labels: { 'wud.trigger.docker.autoupdate.enabled': true },
                }),
            ).toBe(true);
            expect(
                tr.isTriggerEnabled({
                    labels: { 'wud.trigger.docker.autoupdate.enabled': false },
                }),
            ).toBe(false);
        });

        test('supports case-insensitive string values', () => {
            const tr = new Trigger();
            tr.type = 'docker';
            tr.name = 'autoupdate';
            tr.configuration = { includebydefault: false };

            expect(
                tr.isTriggerEnabled({
                    labels: { 'wud.trigger.docker.autoupdate.enabled': 'TRUE' },
                }),
            ).toBe(true);
            expect(
                tr.isTriggerEnabled({
                    labels: {
                        'wud.trigger.docker.autoupdate.enabled': 'False',
                    },
                }),
            ).toBe(false);
        });
    });

    describe('static helpers: findLabelValue and parseBooleanLabel', () => {
        test('findLabelValue returns undefined when labels undefined', () => {
            expect(Trigger.findLabelValue(undefined, 'test')).toBeUndefined();
        });

        test('findLabelValue finds wud., getwud.app/, or unprefixed label', () => {
            expect(Trigger.findLabelValue({ 'wud.test': 'val1' }, 'test')).toBe(
                'val1',
            );
            expect(
                Trigger.findLabelValue({ 'getwud.app/test': 'val2' }, 'test'),
            ).toBe('val2');
            expect(Trigger.findLabelValue({ test: 'val3' }, 'test')).toBe(
                'val3',
            );
        });

        test('parseBooleanLabel parses boolean, string, and returns undefined for invalid', () => {
            expect(Trigger.parseBooleanLabel(true)).toBe(true);
            expect(Trigger.parseBooleanLabel(false)).toBe(false);
            expect(Trigger.parseBooleanLabel('true')).toBe(true);
            expect(Trigger.parseBooleanLabel('FALSE')).toBe(false);
            expect(Trigger.parseBooleanLabel(undefined)).toBeUndefined();
            expect(Trigger.parseBooleanLabel(null)).toBeUndefined();
            expect(Trigger.parseBooleanLabel('invalid')).toBeUndefined();
        });
    });
});
