import { Gauge, register } from 'prom-client';
import { getContainers } from '../store/container';
import log from '../log';
import { flatten, FlattenedContainer } from '../model/container';

let gaugeContainer: Gauge;
const name = 'wud_containers'
/**
 * Populate gauge.
 */
function populateGauge() {
    gaugeContainer.reset();
    getContainers().forEach((container) => {
        try {
            const flatContainer = flatten(container);
            const flatContainerWithoutLabels = Object.keys(flatContainer)
                .filter((key) => !key.startsWith('labels_'))
                .reduce((obj, key) => {
                    obj[key] = flatContainer[key as keyof FlattenedContainer];
                    return obj;
                }, {} as Record<string, any>);
            gaugeContainer.set(flatContainerWithoutLabels, 1);
        } catch (e: any) {
            log.warn(
                `${container.id} - Error when adding container to the metrics (${e.message})`,
            );
            log.debug(e);
        }
    });
}

/**
 * Init Container prometheus gauge.
 * @returns {Gauge<string>}
 */
export function init() {
    // Replace gauge if init is called more than once
    if (gaugeContainer) {
        register.removeSingleMetric(name);
    }
    gaugeContainer = new Gauge({
        name: name,
        help: 'The watched containers',
        labelNames: [
            'display_icon',
            'display_name',
            'error_message',
            'exclude_tags',
            'id',
            'image_architecture',
            'image_created',
            'image_digest_repo',
            'image_digest_value',
            'image_digest_watch',
            'image_id',
            'image_name',
            'image_os',
            'image_registry_name',
            'image_registry_url',
            'image_tag_semver',
            'image_tag_value',
            'image_variant',
            'include_tags',
            'labels',
            'link_template',
            'link',
            'name',
            'result_created',
            'result_digest',
            'result_link',
            'result_tag',
            'status',
            'transform_tags',
            'trigger_exclude',
            'trigger_include',
            'update_available',
            'update_kind_kind',
            'update_kind_local_value',
            'update_kind_remote_value',
            'update_kind_semver_diff',
            'watcher',
        ],
    });
    log.debug('Start container metrics interval');
    setInterval(populateGauge, 5000);
    populateGauge();
    return gaugeContainer;
}
