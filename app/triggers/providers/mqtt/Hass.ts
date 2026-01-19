// @ts-nocheck
import { getVersion } from '../../../configuration';
import {
    registerContainerAdded,
    registerContainerUpdated,
    registerContainerRemoved,
    registerWatcherStart,
    registerWatcherStop,
} from '../../../event';
import * as containerStore from '../../../store/container';

const HASS_DEVICE_ID = 'wud';
const HASS_DEVICE_NAME = 'wud';
const HASS_MANUFACTURER = 'wud';
const HASS_ENTITY_VALUE_TEMPLATE = '{{ value_json.image_tag_value }}';
const HASS_LATEST_VERSION_TEMPLATE =
    '{% if value_json.update_kind_kind == "digest" %}{{ value_json.result_digest[:15] }}{% else %}{{ value_json.result_tag }}{% endif %}';

/**
 * Get hass entity unique id.
 * @param topic
 * @return {*}
 */
function getHassEntityId(topic) {
    return topic.replace(/\//g, '_');
}

/**
 * Get HA wud device info.
 * @returns {*}
 */
function getHaDevice() {
    return {
        identifiers: [HASS_DEVICE_ID],
        manufacturer: HASS_MANUFACTURER,
        model: HASS_DEVICE_ID,
        name: HASS_DEVICE_NAME,
        sw_version: getVersion(),
    };
}

/**
 * Sanitize icon to meet hass requirements.
 * @param icon
 * @return {*}
 */
function sanitizeIcon(icon) {
    return icon
        .replace('mdi-', 'mdi:')
        .replace('fa-', 'fa:')
        .replace('fab-', 'fab:')
        .replace('far-', 'far:')
        .replace('fas-', 'fas:')
        .replace('si-', 'si:');
}

class Hass {
    constructor({ client, configuration, log }) {
        this.client = client;
        this.configuration = configuration;
        this.log = log;

        // Subscribe to container events to sync HA
        registerContainerAdded((container) =>
            this.addContainerSensor(container),
        );
        registerContainerUpdated((container) =>
            this.addContainerSensor(container),
        );
        registerContainerRemoved((container) =>
            this.removeContainerSensor(container),
        );

        // Subscribe to watcher events to sync HA
        registerWatcherStart((watcher) =>
            this.updateWatcherSensors({ watcher, isRunning: true }),
        );
        registerWatcherStop((watcher) =>
            this.updateWatcherSensors({ watcher, isRunning: false }),
        );
    }

    /**
     * Add container sensor.
     * @param container
     * @returns {Promise<void>}
     */
    async addContainerSensor(container) {
        const containerStateSensor = {
            kind: 'update',
            topic: this.getContainerStateTopic({ container }),
        };
        this.log.info(
            `Add hass container update sensor [${containerStateSensor.topic}]`,
        );
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: this.getDiscoveryTopic({
                    kind: containerStateSensor.kind,
                    topic: containerStateSensor.topic,
                }),
                kind: containerStateSensor.kind,
                stateTopic: containerStateSensor.topic,
                name: container.displayName,
                icon: sanitizeIcon(container.displayIcon),
                options: {
                    force_update: true,
                    value_template: HASS_ENTITY_VALUE_TEMPLATE,
                    latest_version_topic: containerStateSensor.topic,
                    latest_version_template: HASS_LATEST_VERSION_TEMPLATE,
                    release_url: container.result
                        ? container.result.link
                        : undefined,
                    json_attributes_topic: containerStateSensor.topic,
                },
            });
        }
        await this.updateContainerSensors(container);
    }

    /**
     * Remove container sensor.
     * @param container
     * @returns {Promise<void>}
     */
    async removeContainerSensor(container) {
        const containerStateSensor = {
            kind: 'update',
            topic: this.getContainerStateTopic({ container }),
        };
        this.log.info(
            `Remove hass container update sensor [${containerStateSensor.topic}]`,
        );
        if (this.configuration.hass.discovery) {
            await this.removeSensor({
                discoveryTopic: this.getDiscoveryTopic({
                    kind: containerStateSensor.kind,
                    topic: containerStateSensor.topic,
                }),
            });
        }
        await this.updateContainerSensors(container);
    }

    async updateContainerSensors(container) {
        // Sensor topics and kinds
        const totalCountSensor = {
            kind: 'sensor',
            topic: `${this.configuration.topic}/total_count`,
        };
        const totalUpdateCountSensor = {
            kind: 'sensor',
            topic: `${this.configuration.topic}/update_count`,
        };
        const totalUpdateStatusSensor = {
            kind: 'binary_sensor',
            topic: `${this.configuration.topic}/update_status`,
        };
        const watcherTotalCountSensor = {
            kind: 'sensor',
            topic: `${this.configuration.topic}/${container.watcher}/total_count`,
        };
        const watcherUpdateCountSensor = {
            kind: 'sensor',
            topic: `${this.configuration.topic}/${container.watcher}/update_count`,
        };
        const watcherUpdateStatusSensor = {
            kind: 'binary_sensor',
            topic: `${this.configuration.topic}/${container.watcher}/update_status`,
        };

        // Discovery topics
        const totalCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: totalCountSensor.kind,
            topic: totalCountSensor.topic,
        });
        const totalUpdateCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: totalUpdateCountSensor.kind,
            topic: totalUpdateCountSensor.topic,
        });
        const totalUpdateStatusDiscoveryTopic = this.getDiscoveryTopic({
            kind: totalUpdateStatusSensor.kind,
            topic: totalUpdateStatusSensor.topic,
        });
        const watcherTotalCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: watcherTotalCountSensor.kind,
            topic: watcherTotalCountSensor.topic,
        });
        const watcherUpdateCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: watcherUpdateCountSensor.kind,
            topic: watcherUpdateCountSensor.topic,
        });
        const watcherUpdateStatusDiscoveryTopic = this.getDiscoveryTopic({
            kind: watcherUpdateStatusSensor.kind,
            topic: watcherUpdateStatusSensor.topic,
        });

        // Publish discovery messages
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: totalCountDiscoveryTopic,
                stateTopic: totalCountSensor.topic,
                kind: totalCountSensor.kind,
                name: 'Total container count',
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: totalUpdateCountDiscoveryTopic,
                stateTopic: totalUpdateCountSensor.topic,
                kind: totalUpdateCountSensor.kind,
                name: 'Total container update count',
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: totalUpdateStatusDiscoveryTopic,
                stateTopic: totalUpdateStatusSensor.topic,
                kind: totalUpdateStatusSensor.kind,
                name: 'Total container update status',
                options: {
                    payload_on: true.toString(),
                    payload_off: false.toString(),
                },
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherTotalCountDiscoveryTopic,
                stateTopic: watcherTotalCountSensor.topic,
                kind: watcherTotalCountSensor.kind,
                name: `Watcher ${container.watcher} container count`,
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherUpdateCountDiscoveryTopic,
                stateTopic: watcherUpdateCountSensor.topic,
                kind: watcherUpdateCountSensor.kind,
                name: `Watcher ${container.watcher} container update count`,
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherUpdateStatusDiscoveryTopic,
                stateTopic: watcherUpdateStatusSensor.topic,
                kind: watcherUpdateStatusSensor.kind,
                name: `Watcher ${container.watcher} container update status`,
                options: {
                    payload_on: true.toString(),
                    payload_off: false.toString(),
                },
            });
        }

        // Count all containers
        const totalCount = containerStore.getContainers().length;
        const updateCount = containerStore.getContainers({
            updateAvailable: true,
        }).length;

        // Count all containers belonging to the current watcher
        const watcherTotalCount = containerStore.getContainers({
            watcher: container.watcher,
        }).length;
        const watcherUpdateCount = containerStore.getContainers({
            watcher: container.watcher,
            updateAvailable: true,
        }).length;

        // Publish sensors
        await this.updateSensor({
            topic: totalCountSensor.topic,
            value: totalCount,
        });
        await this.updateSensor({
            topic: totalUpdateCountSensor.topic,
            value: updateCount,
        });
        await this.updateSensor({
            topic: totalUpdateStatusSensor.topic,
            value: updateCount > 0,
        });
        await this.updateSensor({
            topic: watcherTotalCountSensor.topic,
            value: watcherTotalCount,
        });
        await this.updateSensor({
            topic: watcherUpdateCountSensor.topic,
            value: watcherUpdateCount,
        });
        await this.updateSensor({
            topic: watcherUpdateStatusSensor.topic,
            value: watcherUpdateCount > 0,
        });

        // Delete watcher sensors when watcher does not exist anymore
        if (watcherTotalCount === 0 && this.configuration.hass.discovery) {
            await this.removeSensor({
                discoveryTopic: watcherTotalCountDiscoveryTopic,
            });
            await this.removeSensor({
                discoveryTopic: watcherUpdateCountDiscoveryTopic,
            });
            await this.removeSensor({
                discoveryTopic: watcherUpdateStatusDiscoveryTopic,
            });
        }
    }

    async updateWatcherSensors({ watcher, isRunning }) {
        const watcherStatusSensor = {
            kind: 'binary_sensor',
            topic: `${this.configuration.topic}/${watcher.name}/running`,
        };
        const watcherStatusDiscoveryTopic = this.getDiscoveryTopic({
            kind: watcherStatusSensor.kind,
            topic: watcherStatusSensor.topic,
        });

        // Publish discovery messages
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherStatusDiscoveryTopic,
                stateTopic: watcherStatusSensor.topic,
                kind: watcherStatusSensor.kind,
                options: {
                    payload_on: true.toString(),
                    payload_off: false.toString(),
                },
                name: `Watcher ${watcher.name} running status`,
            });
        }

        // Publish sensors
        await this.updateSensor({
            topic: watcherStatusSensor.topic,
            value: isRunning,
        });
    }

    /**
     * Publish a discovery message.
     * @param discoveryTopic
     * @param stateTopic
     * @param kind
     * @param name
     * @param icon
     * @param options
     * @returns {Promise<*>}
     */
    async publishDiscoveryMessage({
        discoveryTopic,
        stateTopic,
        kind,
        name,
        icon,
        options = {},
    }) {
        const entityId = getHassEntityId(stateTopic);
        return this.client.publish(
            discoveryTopic,
            JSON.stringify({
                unique_id: entityId,
                default_entity_id: `${kind}.${entityId}`,
                name: name || entityId,
                device: getHaDevice(),
                icon: icon || sanitizeIcon('mdi:docker'),
                entity_picture:
                    'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
                state_topic: stateTopic,
                ...options,
            }),
            {
                retain: true,
            },
        );
    }

    /**
     * Publish an empty message to discovery topic to remove the sensor.
     * @param discoveryTopic
     * @returns {Promise<*>}
     */
    async removeSensor({ discoveryTopic }) {
        return this.client.publish(discoveryTopic, JSON.stringify({}), {
            retain: true,
        });
    }

    /**
     * Publish a sensor message.
     * @param topic
     * @param value
     * @returns {Promise<*>}
     */
    async updateSensor({ topic, value }) {
        return this.client.publish(topic, value.toString(), { retain: true });
    }

    /**
     * Get container state topic.
     * @param container
     * @return {string}
     */
    getContainerStateTopic({ container }) {
        const containerName = container.name.replace(/\./g, '-');
        return `${this.configuration.topic}/${container.watcher}/${containerName}`;
    }

    /**
     * Get discovery topic for an entity topic.
     * @param kind
     * @param topic
     * @returns {string}
     */
    getDiscoveryTopic({ kind, topic }) {
        return `${this.configuration.hass.prefix}/${kind}/${getHassEntityId(topic)}/config`;
    }
}

export default Hass;
