import { byValues, byString } from 'sort-es';
import * as registry from '../registry';
import { Container } from '../model/container';
import Trigger from './providers/Trigger';

/**
 * Trigger types capable of performing a container update, as opposed to
 * pure notification/webhook triggers. Kept in sync with
 * UPDATER_TRIGGER_TYPES in ui/src/components/ContainerUpdateDialog.vue so
 * the web UI's Update dialog and any other automatic update path (e.g. the
 * Home Assistant MQTT install button) agree on what counts as an "update
 * trigger" for a container.
 */
export const UPDATE_TRIGGER_TYPES = [
    'docker',
    'dockercompose',
    'command',
    'nomad',
];

/**
 * Resolve which registered triggers are associated with a container,
 * honoring `wud.trigger.include` / `wud.trigger.exclude` label scoping and
 * each trigger's `includebydefault` configuration.
 *
 * Shared by the REST trigger list (backing the web UI's Update dialog, see
 * `getContainerTriggers` in `app/api/container.ts`) and the Home Assistant
 * MQTT install handler (`app/triggers/providers/mqtt/Hass.ts`), so both
 * surfaces agree on which triggers apply to a given container instead of
 * the latter firing every registered trigger of a hardcoded type.
 *
 * @returns a Map of trigger id ("type.name") -> threshold override (or
 * undefined when include/exclude didn't specify one), for every trigger
 * associated with the container.
 */
export function getAssociatedTriggerIds(
    container: Pick<Container, 'triggerInclude' | 'triggerExclude'>,
): Map<string, string | undefined> {
    const includedTriggers = container.triggerInclude
        ? container.triggerInclude
              .split(/\s*,\s*/)
              .map((includedTrigger) =>
                  Trigger.parseIncludeOrIncludeTriggerString(includedTrigger),
              )
        : undefined;
    const excludedTriggerIds = container.triggerExclude
        ? container.triggerExclude
              .split(/\s*,\s*/)
              .map(
                  (excludedTrigger) =>
                      Trigger.parseIncludeOrIncludeTriggerString(
                          excludedTrigger,
                      ).id,
              )
        : undefined;

    const associated = new Map<string, string | undefined>();
    Object.entries(registry.getState().trigger).forEach(([id, trigger]) => {
        let isAssociated = trigger.configuration?.includebydefault !== false;
        let threshold: string | undefined;
        if (includedTriggers) {
            const includedTrigger = includedTriggers.find((tr) => tr.id === id);
            isAssociated = !!includedTrigger;
            threshold = includedTrigger?.threshold;
        }
        if (excludedTriggerIds && excludedTriggerIds.includes(id)) {
            isAssociated = false;
        }
        if (isAssociated) {
            associated.set(id, threshold);
        }
    });
    return associated;
}

/**
 * Sort triggers by (type, name), matching `mapComponentsToList` in
 * `app/api/component.ts` (the ordering `GET /:id/triggers` returns, and
 * therefore the order the web UI's Update dialog dropdown lists them and
 * defaults its selection from).
 *
 * Anything that needs to break a tie between several equally-associated
 * update-capable triggers (e.g. the Home Assistant install handler falling
 * back when no docker/dockercompose trigger is associated) must sort with
 * this first - the trigger registry itself has no guaranteed order (it
 * reflects component registration order, not configuration order), so
 * picking an unsorted "first" trigger is non-deterministic and can disagree
 * with what the web UI would have defaulted to for the same container.
 */
export function sortTriggersByTypeAndName<
    T extends { type: string; name: string },
>(triggers: T[]): T[] {
    return [...triggers].sort(
        byValues([
            [(trigger: T) => trigger.type, byString()],
            [(trigger: T) => trigger.name, byString()],
        ]),
    );
}
