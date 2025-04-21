import { Authentication } from '../authentications/providers/Authentication';
import { Registry } from '../registries/Registry';
import { Trigger } from '../triggers/providers/Trigger';
import { Watcher } from '../watchers/Watcher';

/**
 * Registry state.
 */
export const states: {
    trigger: { [key: string]: Trigger; };
    watcher: { [key: string]: Watcher; };
    registry: { [key: string]: Registry; };
    authentication: { [key: string]: Authentication; };
} = {
    trigger: {},
    watcher: {},
    registry: {},
    authentication: {},
};

export function getState() {
    return states;
}
