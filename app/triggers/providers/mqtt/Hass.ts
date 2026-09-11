import mqtt from 'mqtt/*';
import { getVersion } from '../../../configuration';
import {
    registerContainerAdded,
    registerContainerUpdated,
    registerContainerRemoved,
    registerWatcherStart,
    registerWatcherStop,
} from '../../../event';
import { Container, flatten } from '../../../model/container';
import * as containerStore from '../../../store/container';
import * as registry from '../../../registry';
import Watcher from '../../../watchers/Watcher';
import { MqqtConfiguration as MqttConfiguration } from './Mqtt';
import { Logger } from 'pino';

const HASS_MANUFACTURER = 'wud';
const HASS_ENTITY_VALUE_TEMPLATE = '{{ value_json.image_tag_value }}';
const HASS_LATEST_VERSION_TEMPLATE =
    '{% if value_json.update_kind_kind == "digest" %}{{ value_json.result_digest[:15] }}{% elif value_json.result_tag is defined %}{{ value_json.result_tag }}{% elif value_json.result_digest is defined %}{{ value_json.result_digest[:15] }}{% else %}{{ value_json.image_tag_value }}{% endif %}';
const HASS_BOOLEAN_OPTIONS = {
    payload_on: true.toString(),
    payload_off: false.toString(),
};

type HassSensorKind = 'sensor' | 'binary_sensor' | 'update';
type HassSensorValue = string | number | boolean;
type HassDiscoveryOptions = Record<string, HassSensorValue | undefined>;

interface HassSensor {
    kind: HassSensorKind;
    topic: string;
}

interface HassDiscoverySensor extends HassSensor {
    name?: string;
    options?: HassDiscoveryOptions;
}

interface HassNamedSensor {
    sensor: HassSensor;
    name: string;
    options?: HassDiscoveryOptions;
}

interface HassSensorUpdate {
    sensor: HassSensor;
    value: HassSensorValue;
}

interface HassDiscoveryMessage {
    discoveryTopic: string;
    stateTopic: string;
    kind: HassSensorKind;
    name?: string;
    icon?: string;
    options?: HassDiscoveryOptions;
    watcherName?: string;
}

/**
 * Get hass entity unique id.
 */
function getHassEntityId(topic: string) {
    return topic.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get HA wud device info.
 */
function getHaDevice(configuration: MqttConfiguration, watcherName?: string) {
    const deviceId = watcherName
        ? `${configuration.hass.deviceid}_${watcherName}`
        : configuration.hass.deviceid;
    const deviceName = watcherName
        ? `${configuration.hass.devicename} (${watcherName})`
        : configuration.hass.devicename;
    return {
        identifiers: [deviceId],
        manufacturer: HASS_MANUFACTURER,
        model: watcherName
            ? `Watcher ${watcherName}`
            : configuration.hass.deviceid,
        name: deviceName,
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

class Hass {
    log: Logger;
    client!: mqtt.MqttClient;
    configuration: MqttConfiguration;

    constructor({
        configuration,
        log,
    }: {
        configuration: MqttConfiguration;
        log: Logger;
    }) {
        this.configuration = configuration;
        this.log = log;
    }

    /**
     * Initialize the component.
     *
     * Set connection status sensor to online and subscribe to container and watcher events.
     */
    async init(client: mqtt.MqttClient) {
        this.client = client;

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
        registerWatcherStop(async (watcher) => {
            await this.updateWatcherSensors({ watcher, isRunning: false });
            await this.updateContainerSensors({
                watcher: watcher.name,
            } as Container);
        });

        // Subscribe to install command pattern
        if (typeof this.client.subscribe === 'function') {
            this.client.subscribe(`${this.configuration.topic}/+/+/install`);
        }
        if (typeof this.client.on === 'function') {
            this.client.on('message', async (topic, message) => {
                const prefix = `${this.configuration.topic}/`;
                const suffix = '/install';
                if (
                    topic.startsWith(prefix) &&
                    topic.endsWith(suffix) &&
                    message &&
                    message.toString() === 'INSTALL'
                ) {
                    const middle = topic.substring(
                        prefix.length,
                        topic.length - suffix.length,
                    );
                    const parts = middle.split('/');
                    if (parts.length === 2) {
                        await this.handleInstallCommand(topic);
                    }
                }
            });
        }

        // Publish global sensors once at startup if containers exist
        const containers = containerStore.getContainers();
        if (containers && containers.length > 0) {
            await this.updateContainerSensors(containers[0]);
        }
    }

    async publishDiscoveryMessages(sensors: HassDiscoverySensor[]) {
        for (const sensor of sensors) {
            await this.publishDiscoveryMessage({
                discoveryTopic: this.getDiscoveryTopic(sensor),
                stateTopic: sensor.topic,
                kind: sensor.kind,
                name: sensor.name,
                options: sensor.options,
            });
        }
    }

    async updateSensors(sensors: HassSensorUpdate[]) {
        for (const { sensor, value } of sensors) {
            await this.updateSensor({ topic: sensor.topic, value });
        }
    }

    /**
     * Add container sensor.
     */
    async addContainerSensor(container: Container) {
        const containerStateSensor: HassSensor = {
            kind: 'update',
            topic: this.getContainerStateTopic({ container }),
        };
        this.log.info(
            `Add hass container update sensor [${containerStateSensor.topic}]`,
        );
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: this.getDiscoveryTopic(containerStateSensor),
                kind: containerStateSensor.kind,
                stateTopic: containerStateSensor.topic,
                name: container.displayName,
                icon: sanitizeIcon(container.displayIcon || 'mdi:docker'),
                watcherName: container.watcher,
                options: {
                    // Home Assistant's "Updates" page prints the DEVICE name as
                    // the headline and falls back to the entity name only when
                    // the entity has no device. Every wud container shares one
                    // device, so without a title every row reads "wud" followed
                    // by a bare version. `title` puts the container name into
                    // the supporting text, making the rows distinguishable.
                    title: container.displayName,
                    force_update: true,
                    installed_version_template: HASS_ENTITY_VALUE_TEMPLATE,
                    latest_version_topic: containerStateSensor.topic,
                    latest_version_template: HASS_LATEST_VERSION_TEMPLATE,
                    command_topic: this.getContainerCommandTopic({ container }),
                    payload_install: 'INSTALL',
                    in_progress_template:
                        '{{ value_json.in_progress | default(false) }}',
                    release_url: container.result
                        ? container.result.link
                        : undefined,
                    json_attributes_topic: containerStateSensor.topic,
                },
            });
        }
    }

    /**
     * Remove container sensor.
     */
    async removeContainerSensor(container: Container) {
        const containerStateSensor: HassSensor = {
            kind: 'update',
            topic: this.getContainerStateTopic({ container }),
        };
        this.log.info(
            `Remove hass container update sensor [${containerStateSensor.topic}]`,
        );
        await this.client.publish(containerStateSensor.topic, '', {
            retain: true,
        });
        if (this.configuration.hass.discovery) {
            await this.removeSensor({
                discoveryTopic: this.getDiscoveryTopic(containerStateSensor),
            });
        }
    }

    async updateContainerSensors(container: Container) {
        const sensors: Record<
            | 'totalCount'
            | 'totalUpdateCount'
            | 'totalUpdateStatus'
            | 'watcherTotalCount'
            | 'watcherUpdateCount'
            | 'watcherUpdateStatus',
            HassNamedSensor
        > = {
            totalCount: {
                sensor: {
                    kind: 'sensor',
                    topic: `${this.configuration.topic}/total_count`,
                },
                name: 'Total container count',
            },
            totalUpdateCount: {
                sensor: {
                    kind: 'sensor',
                    topic: `${this.configuration.topic}/update_count`,
                },
                name: 'Total container update count',
            },
            totalUpdateStatus: {
                sensor: {
                    kind: 'binary_sensor',
                    topic: `${this.configuration.topic}/update_status`,
                },
                name: 'Total container update status',
                options: HASS_BOOLEAN_OPTIONS,
            },
            watcherTotalCount: {
                sensor: {
                    kind: 'sensor',
                    topic: `${this.configuration.topic}/${container.watcher}/total_count`,
                },
                name: `Watcher ${container.watcher} container count`,
            },
            watcherUpdateCount: {
                sensor: {
                    kind: 'sensor',
                    topic: `${this.configuration.topic}/${container.watcher}/update_count`,
                },
                name: `Watcher ${container.watcher} container update count`,
            },
            watcherUpdateStatus: {
                sensor: {
                    kind: 'binary_sensor',
                    topic: `${this.configuration.topic}/${container.watcher}/update_status`,
                },
                name: `Watcher ${container.watcher} container update status`,
                options: HASS_BOOLEAN_OPTIONS,
            },
        };

        // Publish discovery messages
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessages(
                Object.values(sensors).map(({ sensor, name, options }) => ({
                    ...sensor,
                    name,
                    options,
                })),
            );
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

        await this.updateSensors([
            { sensor: sensors.totalCount.sensor, value: totalCount },
            {
                sensor: sensors.totalUpdateCount.sensor,
                value: updateCount,
            },
            {
                sensor: sensors.totalUpdateStatus.sensor,
                value: updateCount > 0,
            },
            {
                sensor: sensors.watcherTotalCount.sensor,
                value: watcherTotalCount,
            },
            {
                sensor: sensors.watcherUpdateCount.sensor,
                value: watcherUpdateCount,
            },
            {
                sensor: sensors.watcherUpdateStatus.sensor,
                value: watcherUpdateCount > 0,
            },
        ]);

        // Delete watcher sensors when watcher does not exist anymore
        if (watcherTotalCount === 0 && this.configuration.hass.discovery) {
            for (const sensor of [
                sensors.watcherTotalCount,
                sensors.watcherUpdateCount,
                sensors.watcherUpdateStatus,
            ]) {
                await this.removeSensor({
                    discoveryTopic: this.getDiscoveryTopic(sensor.sensor),
                });
            }
        }
    }

    async updateWatcherSensors({
        watcher,
        isRunning,
    }: {
        watcher: Pick<Watcher, 'name'>;
        isRunning: boolean;
    }) {
        const watcherStatusSensor: HassSensor = {
            kind: 'binary_sensor',
            topic: `${this.configuration.topic}/${watcher.name}/running`,
        };

        // Publish discovery messages
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: this.getDiscoveryTopic(watcherStatusSensor),
                stateTopic: watcherStatusSensor.topic,
                kind: watcherStatusSensor.kind,
                options: HASS_BOOLEAN_OPTIONS,
                name: `Watcher ${watcher.name} running status`,
                watcherName: watcher.name,
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
     */
    async publishDiscoveryMessage({
        discoveryTopic,
        stateTopic,
        kind,
        name,
        icon,
        options = {},
        watcherName,
    }: HassDiscoveryMessage) {
        const entityId = getHassEntityId(stateTopic);
        return this.client.publish(
            discoveryTopic,
            JSON.stringify({
                unique_id: entityId,
                default_entity_id: `${kind}.${entityId}`,
                name: name || entityId,
                device: getHaDevice(this.configuration, watcherName),
                icon: icon || sanitizeIcon('mdi:docker'),
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
     */
    async removeSensor({ discoveryTopic }: { discoveryTopic: string }) {
        return this.client.publish(discoveryTopic, '', {
            retain: true,
        });
    }

    /**
     * Publish a sensor message.
     */
    async updateSensor({
        topic,
        value,
    }: {
        topic: string;
        value: HassSensorValue;
    }) {
        return this.client.publish(topic, value.toString(), { retain: true });
    }

    /**
     * Get container state topic.
     */
    getContainerStateTopic({ container }: { container: Container }) {
        const containerName = container.name.replace(/\./g, '-');
        return `${this.configuration.topic}/${container.watcher}/${containerName}`;
    }

    /**
     * Get container command topic.
     */
    getContainerCommandTopic({ container }: { container: Container }) {
        const containerName = container.name.replace(/\./g, '-');
        return `${this.configuration.topic}/${container.watcher}/${containerName}/install`;
    }

    /**
     * Handle install command from Home Assistant.
     */
    async handleInstallCommand(topic: string) {
        const prefix = `${this.configuration.topic}/`;
        const suffix = '/install';
        if (!topic.startsWith(prefix) || !topic.endsWith(suffix)) {
            return;
        }
        const middle = topic.substring(
            prefix.length,
            topic.length - suffix.length,
        );
        const [watcher, containerName] = middle.split('/');
        if (!watcher || !containerName) {
            return;
        }

        const container = (containerStore.getContainers() || []).find(
            (c) =>
                c.watcher === watcher &&
                (c.name.replace(/\./g, '-') === containerName ||
                    c.name === containerName),
        );

        if (!container) {
            this.log.warn(
                `Container not found for install command on topic ${topic}`,
            );
            return;
        }

        const stateTopic = this.getContainerStateTopic({ container });
        try {
            await this.client.publish(
                stateTopic,
                JSON.stringify({ ...flatten(container), in_progress: true }),
                { retain: true },
            );
            const triggers = Object.values(registry.getState().trigger).filter(
                (trigger) =>
                    trigger.type === 'docker' ||
                    trigger.type === 'dockercompose',
            );
            for (const trigger of triggers) {
                await trigger.trigger(container);
            }
        } catch (error) {
            this.log.error(
                `Failed to handle install command for container ${container.name}: ${error}`,
            );
        } finally {
            const currentContainer =
                containerStore.getContainer(container.id) || container;
            await this.client.publish(
                stateTopic,
                JSON.stringify({
                    ...flatten(currentContainer),
                    in_progress: false,
                }),
                { retain: true },
            );
        }
    }

    /**
     * Get discovery topic for an entity topic.
     */
    getDiscoveryTopic({ kind, topic }: HassSensor) {
        return `${this.configuration.hass.prefix}/${kind}/${getHassEntityId(topic)}/config`;
    }

    /**
     * Get WUD state topic.
     * @return WUD state topic
     */
    getStateTopic() {
        return `${this.configuration.topic}/status`;
    }

    /**
     * Get will message.
     *
     * Allows MQTT broker to set WUD status to offline when WUD disconnects unexpectedly.
     *
     * @returns The will message object with topic, payload, and retain properties
     */
    getWill() {
        return {
            topic: this.getStateTopic(),
            payload: 'offline',
            retain: true,
        };
    }

    /**
     * Update the connection status sensor.
     * @param connected Whether WUD is currently connected to the MQTT broker
     */
    async updateConnectionStatusSensor(connected: boolean) {
        const connectionStatusSensor: HassSensor = {
            kind: 'binary_sensor',
            topic: this.getStateTopic(),
        };

        const connectionStatusDiscoveryTopic = this.getDiscoveryTopic(
            connectionStatusSensor,
        );

        // Publish discovery message
        if (this.configuration.hass.discovery) {
            await this.publishDiscoveryMessage({
                discoveryTopic: connectionStatusDiscoveryTopic,
                stateTopic: connectionStatusSensor.topic,
                kind: connectionStatusSensor.kind,
                options: {
                    device_class: 'connectivity',
                    payload_on: 'online',
                    payload_off: 'offline',
                },
                name: 'Connection status',
            });
        }

        // Publish sensor
        await this.updateSensor({
            topic: connectionStatusSensor.topic,
            value: connected ? 'online' : 'offline',
        });
    }
}

export default Hass;
