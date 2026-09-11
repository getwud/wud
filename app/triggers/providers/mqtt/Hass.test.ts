// @ts-nocheck
import log from '../../../log';
import Hass from './Hass';
import * as containerStore from '../../../store/container';
import * as registry from '../../../registry';

const containerData = [
    {
        containerName: 'container-name',
        data: {
            discoveryTopic:
                'homeassistant/update/topic_watcher-name_container-name/config',
            unique_id: 'topic_watcher-name_container-name',
            default_entity_id: 'update.topic_watcher-name_container-name',
            name: 'topic_watcher-name_container-name',
            topic: 'topic/watcher-name/container-name',
        },
    },
    {
        containerName: 'container-1.name',
        data: {
            discoveryTopic:
                'homeassistant/update/topic_watcher-name_container-1-name/config',
            unique_id: 'topic_watcher-name_container-1-name',
            default_entity_id: 'update.topic_watcher-name_container-1-name',
            name: 'topic_watcher-name_container-1-name',
            topic: 'topic/watcher-name/container-1-name',
        },
    },
];

let hass;
let mqttClientMock;
let messageHandler;

beforeEach(async () => {
    jest.resetAllMocks();
    messageHandler = undefined;
    mqttClientMock = {
        publish: jest.fn(() => {}),
        subscribe: jest.fn(),
        on: jest.fn((event, handler) => {
            if (event === 'message') {
                messageHandler = handler;
            }
        }),
    };
    hass = new Hass({
        configuration: {
            topic: 'topic',
            hass: {
                discovery: true,
                prefix: 'homeassistant',
                devicename: 'wud',
                deviceid: 'wud',
            },
        },
        log,
    });
    await hass.init(mqttClientMock);
});

test('init must subscribe to install topic pattern', () => {
    expect(mqttClientMock.subscribe).toHaveBeenCalledWith('topic/+/+/install');
});

test('publishDiscoveryMessage must publish a discovery message expected by HA', async () => {
    await hass.publishDiscoveryMessage({
        discoveryTopic: 'my/discovery',
        stateTopic: 'my/state',
        kind: 'sensor',
        name: 'My state',
        options: {
            myOption: true,
        },
    });
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'my/discovery',
        JSON.stringify({
            unique_id: 'my_state',
            default_entity_id: 'sensor.my_state',
            name: 'My state',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            state_topic: 'my/state',
            myOption: true,
        }),
        { retain: true },
    );
});

test('publishDiscoveryMessage must sanitize entity id with special characters', async () => {
    await hass.publishDiscoveryMessage({
        discoveryTopic: 'my/discovery',
        stateTopic: 'my/state.with:special@chars',
        kind: 'sensor',
    });
    const discoveryPayload = JSON.parse(
        mqttClientMock.publish.mock.calls[0][1],
    );
    expect(discoveryPayload.unique_id).toEqual('my_state_with_special_chars');
    expect(discoveryPayload.default_entity_id).toEqual(
        'sensor.my_state_with_special_chars',
    );
});

test('publishDiscoveryMessage must use the configured device id and name', async () => {
    const configuredHass = new Hass({
        configuration: {
            topic: 'topic',
            hass: {
                discovery: true,
                prefix: 'homeassistant',
                deviceid: 'custom-device-id',
                devicename: 'Custom Device Name',
            },
        },
        log,
    });
    await configuredHass.init(mqttClientMock);

    await configuredHass.publishDiscoveryMessage({
        discoveryTopic: 'my/discovery',
        stateTopic: 'my/state',
        kind: 'sensor',
        name: 'My state',
    });

    const discoveryPayload = JSON.parse(
        mqttClientMock.publish.mock.calls[0][1],
    );
    expect(discoveryPayload.device).toEqual({
        identifiers: ['custom-device-id'],
        manufacturer: 'wud',
        model: 'custom-device-id',
        name: 'Custom Device Name',
        sw_version: 'unknown',
    });
});

test('addContainerSensor must publish sensor discovery message expected by HA', async () => {
    await hass.addContainerSensor({
        name: 'container-name',
        watcher: 'watcher-name',
        displayIcon: 'mdi:docker',
    });
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'homeassistant/update/topic_watcher-name_container-name/config',
        JSON.stringify({
            unique_id: 'topic_watcher-name_container-name',
            default_entity_id: 'update.topic_watcher-name_container-name',
            name: 'topic_watcher-name_container-name',
            device: {
                identifiers: ['wud_watcher-name'],
                manufacturer: 'wud',
                model: 'Watcher watcher-name',
                name: 'wud (watcher-name)',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            state_topic: 'topic/watcher-name/container-name',
            force_update: true,
            value_template: '{{ value_json.image_tag_value }}',
            latest_version_topic: 'topic/watcher-name/container-name',
            latest_version_template:
                '{% if value_json.update_kind_kind == "digest" %}{{ value_json.result_digest[:15] }}{% elif value_json.result_tag is defined %}{{ value_json.result_tag }}{% elif value_json.result_digest is defined %}{{ value_json.result_digest[:15] }}{% else %}{{ value_json.image_tag_value }}{% endif %}',
            command_topic: 'topic/watcher-name/container-name/install',
            payload_install: 'INSTALL',
            in_progress_template:
                '{{ value_json.in_progress | default(false) }}',
            json_attributes_topic: 'topic/watcher-name/container-name',
        }),
        { retain: true },
    );
});

test('addContainerSensor must publish the container display name as title', async () => {
    await hass.addContainerSensor({
        name: 'container-name',
        displayName: 'my-container',
        watcher: 'watcher-name',
        displayIcon: 'mdi:docker',
    });
    const discoveryPayload = JSON.parse(
        mqttClientMock.publish.mock.calls[0][1],
    );

    // `name` drives the entity name; `title` is what the HA Updates page shows
    // as supporting text, since the headline is the (shared) device name.
    expect(discoveryPayload.name).toEqual('my-container');
    expect(discoveryPayload.title).toEqual('my-container');
});

test.each(containerData)(
    'removeContainerSensor must publish empty payloads on state and discovery topics expected by HA',
    async ({ containerName, data }) => {
        await hass.removeContainerSensor({
            name: containerName,
            watcher: 'watcher-name',
            displayIcon: 'mdi:docker',
        });
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            1,
            data.topic,
            '',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            2,
            data.discoveryTopic,
            '',
            { retain: true },
        );
    },
);

test.each(containerData)(
    'updateContainerSensors must publish all sensors expected by HA',
    async ({ containerName }) => {
        await hass.updateContainerSensors({
            name: containerName,
            watcher: 'watcher-name',
            displayIcon: 'mdi:docker',
        });
        expect(mqttClientMock.publish).toHaveBeenCalledTimes(15);

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            1,
            'homeassistant/sensor/topic_total_count/config',
            JSON.stringify({
                unique_id: 'topic_total_count',
                default_entity_id: 'sensor.topic_total_count',
                name: 'Total container count',
                device: {
                    identifiers: ['wud'],
                    manufacturer: 'wud',
                    model: 'wud',
                    name: 'wud',
                    sw_version: 'unknown',
                },
                icon: 'mdi:docker',
                state_topic: 'topic/total_count',
            }),
            { retain: true },
        );

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            2,
            'homeassistant/sensor/topic_update_count/config',
            JSON.stringify({
                unique_id: 'topic_update_count',
                default_entity_id: 'sensor.topic_update_count',
                name: 'Total container update count',
                device: {
                    identifiers: ['wud'],
                    manufacturer: 'wud',
                    model: 'wud',
                    name: 'wud',
                    sw_version: 'unknown',
                },
                icon: 'mdi:docker',
                state_topic: 'topic/update_count',
            }),
            { retain: true },
        );

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            3,
            'homeassistant/binary_sensor/topic_update_status/config',
            JSON.stringify({
                unique_id: 'topic_update_status',
                default_entity_id: 'binary_sensor.topic_update_status',
                name: 'Total container update status',
                device: {
                    identifiers: ['wud'],
                    manufacturer: 'wud',
                    model: 'wud',
                    name: 'wud',
                    sw_version: 'unknown',
                },
                icon: 'mdi:docker',
                state_topic: 'topic/update_status',
                payload_on: 'true',
                payload_off: 'false',
            }),
            { retain: true },
        );

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            4,
            'homeassistant/sensor/topic_watcher-name_total_count/config',
            JSON.stringify({
                unique_id: 'topic_watcher-name_total_count',
                default_entity_id: 'sensor.topic_watcher-name_total_count',
                name: 'Watcher watcher-name container count',
                device: {
                    identifiers: ['wud_watcher-name'],
                    manufacturer: 'wud',
                    model: 'Watcher watcher-name',
                    name: 'wud (watcher-name)',
                    sw_version: 'unknown',
                },
                icon: 'mdi:docker',
                state_topic: 'topic/watcher-name/total_count',
            }),
            { retain: true },
        );

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            5,
            'homeassistant/sensor/topic_watcher-name_update_count/config',
            JSON.stringify({
                unique_id: 'topic_watcher-name_update_count',
                default_entity_id: 'sensor.topic_watcher-name_update_count',
                name: 'Watcher watcher-name container update count',
                device: {
                    identifiers: ['wud_watcher-name'],
                    manufacturer: 'wud',
                    model: 'Watcher watcher-name',
                    name: 'wud (watcher-name)',
                    sw_version: 'unknown',
                },
                icon: 'mdi:docker',
                state_topic: 'topic/watcher-name/update_count',
            }),
            { retain: true },
        );

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            6,
            'homeassistant/binary_sensor/topic_watcher-name_update_status/config',
            JSON.stringify({
                unique_id: 'topic_watcher-name_update_status',
                default_entity_id:
                    'binary_sensor.topic_watcher-name_update_status',
                name: 'Watcher watcher-name container update status',
                device: {
                    identifiers: ['wud_watcher-name'],
                    manufacturer: 'wud',
                    model: 'Watcher watcher-name',
                    name: 'wud (watcher-name)',
                    sw_version: 'unknown',
                },
                icon: 'mdi:docker',
                state_topic: 'topic/watcher-name/update_status',
                payload_on: 'true',
                payload_off: 'false',
            }),
            { retain: true },
        );

        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            7,
            'topic/total_count',
            '0',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            8,
            'topic/update_count',
            '0',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            9,
            'topic/update_status',
            'false',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            10,
            'topic/watcher-name/total_count',
            '0',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            11,
            'topic/watcher-name/update_count',
            '0',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            12,
            'topic/watcher-name/update_status',
            'false',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            13,
            'homeassistant/sensor/topic_watcher-name_total_count/config',
            '',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            14,
            'homeassistant/sensor/topic_watcher-name_update_count/config',
            '',
            { retain: true },
        );
        expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
            15,
            'homeassistant/binary_sensor/topic_watcher-name_update_status/config',
            '',
            { retain: true },
        );
    },
);

test('updateWatcherSensors must publish all watcher sensor messages expected by HA', async () => {
    await hass.updateWatcherSensors({
        watcher: {
            name: 'watcher-name',
        },
        isRunning: true,
    });
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'homeassistant/binary_sensor/topic_watcher-name_running/config',
        JSON.stringify({
            unique_id: 'topic_watcher-name_running',
            default_entity_id: 'binary_sensor.topic_watcher-name_running',
            name: 'Watcher watcher-name running status',
            device: {
                identifiers: ['wud_watcher-name'],
                manufacturer: 'wud',
                model: 'Watcher watcher-name',
                name: 'wud (watcher-name)',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            state_topic: 'topic/watcher-name/running',
            payload_on: 'true',
            payload_off: 'false',
        }),
        { retain: true },
    );
});

describe('handleInstallCommand', () => {
    test('must trigger update and update in_progress flag', async () => {
        const mockContainer = {
            id: '1234567890ab',
            name: 'my-app',
            displayName: 'my-app',
            watcher: 'watcher-name',
        };
        jest.spyOn(containerStore, 'getContainers').mockReturnValue([
            mockContainer,
        ]);
        jest.spyOn(containerStore, 'getContainer').mockReturnValue(
            mockContainer,
        );

        const dockerTriggerMock = {
            type: 'docker',
            trigger: jest.fn().mockResolvedValue(undefined),
        };
        const otherTriggerMock = {
            type: 'smtp',
            trigger: jest.fn().mockResolvedValue(undefined),
        };
        registry.getState().trigger = {
            docker: dockerTriggerMock,
            smtp: otherTriggerMock,
        };

        // Simulate incoming MQTT install command message
        await messageHandler(
            'topic/watcher-name/my-app/install',
            Buffer.from('INSTALL'),
        );

        // Should set in_progress: true first
        expect(mqttClientMock.publish).toHaveBeenCalledWith(
            'topic/watcher-name/my-app',
            expect.stringContaining('"in_progress":true'),
            { retain: true },
        );

        // Should call docker trigger
        expect(dockerTriggerMock.trigger).toHaveBeenCalledWith(mockContainer);
        expect(otherTriggerMock.trigger).not.toHaveBeenCalled();

        // Should set in_progress: false in finally
        expect(mqttClientMock.publish).toHaveBeenLastCalledWith(
            'topic/watcher-name/my-app',
            expect.stringContaining('"in_progress":false'),
            { retain: true },
        );
    });

    test('must match container with dots replaced by dashes', async () => {
        const mockContainer = {
            id: '1234567890cd',
            name: 'my.dotted.app',
            displayName: 'my.dotted.app',
            watcher: 'watcher-name',
        };
        jest.spyOn(containerStore, 'getContainers').mockReturnValue([
            mockContainer,
        ]);
        jest.spyOn(containerStore, 'getContainer').mockReturnValue(
            mockContainer,
        );

        const dockerComposeTriggerMock = {
            type: 'dockercompose',
            trigger: jest.fn().mockResolvedValue(undefined),
        };
        registry.getState().trigger = {
            compose: dockerComposeTriggerMock,
        };

        await messageHandler(
            'topic/watcher-name/my-dotted-app/install',
            Buffer.from('INSTALL'),
        );

        expect(dockerComposeTriggerMock.trigger).toHaveBeenCalledWith(
            mockContainer,
        );
    });

    test('should ignore messages if payload is not INSTALL', async () => {
        const mockContainer = {
            id: '1234567890ab',
            name: 'my-app',
            watcher: 'watcher-name',
        };
        jest.spyOn(containerStore, 'getContainers').mockReturnValue([
            mockContainer,
        ]);
        const dockerTriggerMock = {
            type: 'docker',
            trigger: jest.fn(),
        };
        registry.getState().trigger = { docker: dockerTriggerMock };

        await messageHandler(
            'topic/watcher-name/my-app/install',
            Buffer.from('OTHER'),
        );
        expect(dockerTriggerMock.trigger).not.toHaveBeenCalled();
    });

    test('should ignore messages if topic does not match pattern', async () => {
        const mockContainer = {
            id: '1234567890ab',
            name: 'my-app',
            watcher: 'watcher-name',
        };
        jest.spyOn(containerStore, 'getContainers').mockReturnValue([
            mockContainer,
        ]);
        const dockerTriggerMock = {
            type: 'docker',
            trigger: jest.fn(),
        };
        registry.getState().trigger = { docker: dockerTriggerMock };

        await messageHandler(
            'other/topic/watcher-name/my-app/install',
            Buffer.from('INSTALL'),
        );
        expect(dockerTriggerMock.trigger).not.toHaveBeenCalled();
    });

    test('should handle gracefully if container is not found', async () => {
        jest.spyOn(containerStore, 'getContainers').mockReturnValue([]);
        const dockerTriggerMock = {
            type: 'docker',
            trigger: jest.fn(),
        };
        registry.getState().trigger = { docker: dockerTriggerMock };

        await messageHandler(
            'topic/watcher-name/unknown-app/install',
            Buffer.from('INSTALL'),
        );
        expect(dockerTriggerMock.trigger).not.toHaveBeenCalled();
    });
});
