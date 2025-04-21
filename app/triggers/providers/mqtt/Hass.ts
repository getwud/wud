import { MqttClient } from 'mqtt/*';
import { getVersion } from '../../../configuration';
import { registerContainerAdded, registerContainerUpdated, registerContainerRemoved, registerWatcherStart, registerWatcherStop } from '../../../event';
import * as containerStore from '../../../store/container';
import { MqttConfiguration } from './MqttConfiguration';
import Logger from 'bunyan';
import { Container } from '../../../model/container';
import { Watcher } from '../../../watchers/Watcher';

const HASS_DEVICE_ID = 'wud';
const HASS_DEVICE_NAME = 'wud';
const HASS_MANUFACTURER = 'wud';
const HASS_ENTITY_VALUE_TEMPLATE = '{{ value_json.image_tag_value }}';
const HASS_LATEST_VERSION_TEMPLATE =
    '{% if value_json.update_kind_kind == "digest" %}{{ value_json.result_digest[:15] }}{% else %}{{ value_json.result_tag }}{% endif %}';

/**
 * Get hass entity unique id.
 */
function getHassEntityId(topic: string) {
    return topic.replace(/\//g, '_');
}

/**
 * Get HA wud device info.
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
 */
function sanitizeIcon(icon: string) {
    return icon
        .replace('mdi-', 'mdi:')
        .replace('fa-', 'fa:')
        .replace('fab-', 'fab:')
        .replace('far-', 'far:')
        .replace('fas-', 'fas:')
        .replace('si-', 'si:');
}

export class Hass {
    client: MqttClient;
    configuration: MqttConfiguration;
    log: Logger;

    constructor({ client, configuration, log }: {
        client: MqttClient;
        configuration: MqttConfiguration;
        log: Logger;
    }) {
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
     */
    async addContainerSensor(container: Container) {
        const containerStateTopic = this.getContainerStateTopic({ container });
        this.log.info(
            `Add hass container update sensor [${containerStateTopic}]`,
        );
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: this.getDiscoveryTopic({
                    kind: 'update',
                    topic: containerStateTopic,
                }),
                stateTopic: containerStateTopic,
                name: container.displayName,
                icon: sanitizeIcon(container.displayIcon!),
                options: {
                    force_update: true,
                    value_template: HASS_ENTITY_VALUE_TEMPLATE,
                    latest_version_topic: containerStateTopic,
                    latest_version_template: HASS_LATEST_VERSION_TEMPLATE,
                    release_url: container.result
                        ? container.result.link
                        : undefined,
                    json_attributes_topic: containerStateTopic,
                },
            });
        }
        await this.updateContainerSensors(container);
    }

    /**
     * Remove container sensor.
     */
    async removeContainerSensor(container: Container) {
        const containerStateTopic = this.getContainerStateTopic({ container });
        this.log.info(
            `Remove hass container update sensor [${containerStateTopic}]`,
        );
        if (this.configuration.hass.discovery) {
            await this.removeSensor({
                discoveryTopic: this.getDiscoveryTopic({
                    kind: 'update',
                    topic: containerStateTopic,
                }),
            });
        }
        await this.updateContainerSensors(container);
    }

    async updateContainerSensors(container: Container) {
        // Sensor topics
        const totalCountTopic = `${this.configuration.topic}/total_count`;
        const totalUpdateCountTopic = `${this.configuration.topic}/update_count`;
        const totalUpdateStatusTopic = `${this.configuration.topic}/update_status`;
        const watcherTotalCountTopic = `${this.configuration.topic}/${container.watcher}/total_count`;
        const watcherUpdateCountTopic = `${this.configuration.topic}/${container.watcher}/update_count`;
        const watcherUpdateStatusTopic = `${this.configuration.topic}/${container.watcher}/update_status`;

        // Discovery topics
        const totalCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'sensor',
            topic: totalCountTopic,
        });
        const totalUpdateCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'sensor',
            topic: totalUpdateCountTopic,
        });
        const totalUpdateStatusDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'binary_sensor',
            topic: totalUpdateStatusTopic,
        });
        const watcherTotalCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'sensor',
            topic: watcherTotalCountTopic,
        });
        const watcherUpdateCountDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'sensor',
            topic: watcherUpdateCountTopic,
        });
        const watcherUpdateStatusDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'binary_sensor',
            topic: watcherUpdateStatusTopic,
        });

        // Publish discovery messages
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: totalCountDiscoveryTopic,
                stateTopic: totalCountTopic,
                name: 'Total container count',
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: totalUpdateCountDiscoveryTopic,
                stateTopic: totalUpdateCountTopic,
                name: 'Total container update count',
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: totalUpdateStatusDiscoveryTopic,
                stateTopic: totalUpdateStatusTopic,
                name: 'Total container update status',
                options: {
                    payload_on: true.toString(),
                    payload_off: false.toString(),
                },
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherTotalCountDiscoveryTopic,
                stateTopic: watcherTotalCountTopic,
                name: `Watcher ${container.watcher} container count`,
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherUpdateCountDiscoveryTopic,
                stateTopic: watcherUpdateCountTopic,
                name: `Watcher ${container.watcher} container update count`,
            });
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherUpdateStatusDiscoveryTopic,
                stateTopic: watcherUpdateStatusTopic,
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
            updateAvailable: 'true',
        }).length;

        // Count all containers belonging to the current watcher
        const watcherTotalCount = containerStore.getContainers({
            watcher: container.watcher,
        }).length;
        const watcherUpdateCount = containerStore.getContainers({
            watcher: container.watcher,
            updateAvailable: 'true',
        }).length;

        // Publish sensors
        await this.updateSensor({
            topic: totalCountTopic,
            value: totalCount,
        });
        await this.updateSensor({
            topic: totalUpdateCountTopic,
            value: updateCount,
        });
        await this.updateSensor({
            topic: totalUpdateStatusTopic,
            value: updateCount > 0,
        });
        await this.updateSensor({
            topic: watcherTotalCountTopic,
            value: watcherTotalCount,
        });
        await this.updateSensor({
            topic: watcherUpdateCountTopic,
            value: watcherUpdateCount,
        });
        await this.updateSensor({
            topic: watcherUpdateStatusTopic,
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

    async updateWatcherSensors({ watcher, isRunning }: {
        watcher: Watcher;
        isRunning: boolean;
    }) {
        const watcherStatusTopic = `${this.configuration.topic}/${watcher.name}/running`;
        const watcherStatusDiscoveryTopic = this.getDiscoveryTopic({
            kind: 'binary_sensor',
            topic: watcherStatusTopic,
        });

        // Publish discovery messages
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: watcherStatusDiscoveryTopic,
                stateTopic: watcherStatusTopic,
                options: {
                    payload_on: true.toString(),
                    payload_off: false.toString(),
                },
                name: `Watcher ${watcher.name} running status`,
            });
        }

        // Publish sensors
        await this.updateSensor({
            topic: watcherStatusTopic,
            value: isRunning,
        });
    }

    /**
     * Publish a discovery message.
     */
    async publishDiscoveryMessage({
        discoveryTopic,
        stateTopic,
        name,
        icon,
        options = {},
    }: {
        discoveryTopic: string;
        stateTopic: string;
        name?: string;
        icon?: string;
        options?: any;
    }) {
        const entityId = getHassEntityId(stateTopic);
        return this.client.publish(
            discoveryTopic,
            JSON.stringify({
                unique_id: entityId,
                object_id: entityId,
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
    async removeSensor({ discoveryTopic }: { discoveryTopic: string }) {
        return this.client.publish(discoveryTopic, JSON.stringify({}), {
            retain: true,
        });
    }

    /**
     * Publish a sensor message.
     */
    async updateSensor({ topic, value }: { topic: string; value: any }) {
        return this.client.publish(topic, value.toString(), { retain: true });
    }

    /**
     * Get container state topic.
     */
    getContainerStateTopic({ container }: { container: Container }) {
        return `${this.configuration.topic}/${container.watcher}/${container.name}`;
    }

    /**
     * Get discovery topic for an entity topic.
     */
    getDiscoveryTopic({ kind, topic }: {
        kind: 'sensor' | 'binary_sensor' | 'update';
        topic: string;
    }) {
        return `${this.configuration.hass.prefix}/${kind}/${getHassEntityId(topic)}/config`;
    }
}

