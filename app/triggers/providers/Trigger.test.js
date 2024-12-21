const { ValidationError } = require('joi');
const event = require('../../event');
const log = require('../../log');
const Trigger = require('./Trigger');

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

    simpletitle: 'New ${kind} found for container ${name}',

    simplebody:
        'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',

    batchtitle: '${count} updates available',
};

beforeEach(() => {
    jest.resetAllMocks();
    trigger = new Trigger();
    trigger.log = log;
    trigger.configuration = { ...configurationValid };
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        trigger.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
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
