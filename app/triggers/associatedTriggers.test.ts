import {
    getAssociatedTriggerIds,
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
});
