import {
    getAssociatedTriggerIds,
    sortTriggersByTypeAndName,
    UPDATE_TRIGGER_TYPES,
} from './associatedTriggers';
import * as registry from '../registry';

jest.mock('../registry', () => ({
    getState: jest.fn(),
}));

function mockTriggers(
    triggers: Record<string, { includebydefault?: boolean }>,
) {
    (registry.getState as jest.Mock).mockReturnValue({
        trigger: Object.fromEntries(
            Object.entries(triggers).map(([id, configuration]) => [
                id,
                { configuration },
            ]),
        ),
    });
}

describe('getAssociatedTriggerIds', () => {
    test('exposes the update-capable trigger types shared with the web UI', () => {
        expect(UPDATE_TRIGGER_TYPES).toEqual([
            'docker',
            'dockercompose',
            'command',
            'nomad',
        ]);
    });

    test('associates triggers by default unless includebydefault is false', () => {
        mockTriggers({
            'docker.default': {},
            'command.deploy': { includebydefault: false },
        });

        const associated = getAssociatedTriggerIds({});

        expect(associated.has('docker.default')).toBe(true);
        expect(associated.has('command.deploy')).toBe(false);
    });

    test('honors wud.trigger.include to opt-in a trigger excluded by default', () => {
        mockTriggers({
            'docker.default': {},
            'command.deploy': { includebydefault: false },
        });

        const associated = getAssociatedTriggerIds({
            triggerInclude: 'command.deploy',
        });

        expect(associated.has('docker.default')).toBe(false);
        expect(associated.has('command.deploy')).toBe(true);
    });

    test('honors wud.trigger.exclude to opt a container out of a default trigger', () => {
        mockTriggers({
            'docker.default': {},
            'command.deploy': {},
        });

        const associated = getAssociatedTriggerIds({
            triggerExclude: 'docker.default',
        });

        expect(associated.has('docker.default')).toBe(false);
        expect(associated.has('command.deploy')).toBe(true);
    });

    test('captures a threshold override specified on wud.trigger.include', () => {
        mockTriggers({
            'command.deploy': { includebydefault: false },
        });

        const associated = getAssociatedTriggerIds({
            triggerInclude: 'command.deploy:minor',
        });

        expect(associated.get('command.deploy')).toBe('minor');
    });

    test('honors granular instance enable label to opt-in a trigger without excluding default triggers', () => {
        mockTriggers({
            'docker.default': {},
            'command.deploy': { includebydefault: false },
        });

        const associated = getAssociatedTriggerIds({
            labels: {
                'wud.trigger.command.deploy.enabled': 'true',
            },
        });

        expect(associated.has('docker.default')).toBe(true);
        expect(associated.has('command.deploy')).toBe(true);
    });

    test('honors granular instance disable label to opt-out a default trigger', () => {
        mockTriggers({
            'docker.default': {},
            'command.deploy': {},
        });

        const associated = getAssociatedTriggerIds({
            labels: {
                'wud.trigger.docker.default.enabled': 'false',
            },
        });

        expect(associated.has('docker.default')).toBe(false);
        expect(associated.has('command.deploy')).toBe(true);
    });

    test('honors granular type enable and disable labels', () => {
        mockTriggers({
            'docker.app1': {},
            'docker.app2': {},
            'command.deploy': {},
        });

        const associated = getAssociatedTriggerIds({
            labels: {
                'wud.trigger.docker.enabled': 'false',
            },
        });

        expect(associated.has('docker.app1')).toBe(false);
        expect(associated.has('docker.app2')).toBe(false);
        expect(associated.has('command.deploy')).toBe(true);
    });

    test('honors precedence: instance > type > global include/exclude', () => {
        mockTriggers({
            'docker.app1': {},
            'docker.app2': {},
        });

        const associated = getAssociatedTriggerIds({
            triggerExclude: 'docker.app1',
            labels: {
                'wud.trigger.docker.enabled': 'false',
                'wud.trigger.docker.app1.enabled': 'true',
            },
        });

        // instance=true overrides type=false and triggerExclude
        expect(associated.has('docker.app1')).toBe(true);
        // app2 has no instance label, so type=false disables it
        expect(associated.has('docker.app2')).toBe(false);
    });

    test('supports canonical getwud.app/ prefix for granular labels', () => {
        mockTriggers({
            'docker.default': { includebydefault: false },
        });

        const associated = getAssociatedTriggerIds({
            labels: {
                'getwud.app/trigger.docker.default.enabled': 'true',
            },
        });

        expect(associated.has('docker.default')).toBe(true);
    });
});

describe('sortTriggersByTypeAndName', () => {
    test('sorts by type, then by name within a type, regardless of input order', () => {
        const sorted = sortTriggersByTypeAndName([
            { type: 'command', name: 'testfix2' },
            { type: 'docker', name: 'default' },
            { type: 'command', name: 'testfix' },
        ]);

        expect(sorted).toEqual([
            { type: 'command', name: 'testfix' },
            { type: 'command', name: 'testfix2' },
            { type: 'docker', name: 'default' },
        ]);
    });

    test('does not mutate the input array', () => {
        const input = [
            { type: 'command', name: 'b' },
            { type: 'command', name: 'a' },
        ];
        const inputCopy = [...input];

        sortTriggersByTypeAndName(input);

        expect(input).toEqual(inputCopy);
    });
});
