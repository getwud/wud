import { MqttClient } from 'mqtt/*';
import log from '../../../log';
import { Hass } from './Hass';
import { MqttConfiguration } from './MqttConfiguration';
import { Container } from '../../../model/container';
import { Watcher } from '../../../watchers/Watcher';

let hass: Hass;
let mqttClientMock: jest.Mocked<MqttClient>;

beforeEach(() => {
    jest.resetAllMocks();
    mqttClientMock = {
        publish: jest.fn(() => { }),
    } as unknown as jest.Mocked<MqttClient>;
    hass = new Hass({
        client: mqttClientMock,
        configuration: {
            topic: 'topic',
            hass: {
                enabled: true,
                discovery: true,
                prefix: 'homeassistant',
            },
        } as MqttConfiguration,
        log,
    });
});

test('publishDiscoveryMessage must publish a discovery message expected by HA', async () => {
    await hass.publishDiscoveryMessage({
        discoveryTopic: 'my/discovery',
        stateTopic: 'my/state',
        name: 'My state',
        options: {
            myOption: true,
        },
    });
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'my/discovery',
        JSON.stringify({
            unique_id: 'my_state',
            object_id: 'my_state',
            name: 'My state',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'my/state',
            myOption: true,
        }),
        { retain: true },
    );
});

test('addContainerSensor must publish sensor discovery message expected by HA', async () => {
    await hass.addContainerSensor({
        name: 'container-name',
        watcher: 'watcher-name',
        displayIcon: 'mdi:docker',
    } as Container);
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'homeassistant/update/topic_watcher-name_container-name/config',
        JSON.stringify({
            unique_id: 'topic_watcher-name_container-name',
            object_id: 'topic_watcher-name_container-name',
            name: 'topic_watcher-name_container-name',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'topic/watcher-name/container-name',
            force_update: true,
            value_template: '{{ value_json.image_tag_value }}',
            latest_version_topic: 'topic/watcher-name/container-name',
            latest_version_template:
                '{% if value_json.update_kind_kind == "digest" %}{{ value_json.result_digest[:15] }}{% else %}{{ value_json.result_tag }}{% endif %}',
            json_attributes_topic: 'topic/watcher-name/container-name',
        }),
        { retain: true },
    );
});

test('removeContainerSensor must publish sensor discovery message expected by HA', async () => {
    await hass.removeContainerSensor({
        name: 'container-name',
        watcher: 'watcher-name',
        displayIcon: 'mdi:docker',
    } as Container);
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'homeassistant/update/topic_watcher-name_container-name/config',
        JSON.stringify({}),
        { retain: true },
    );
});

test('updateContainerSensors must publish all sensors expected by HA', async () => {
    await hass.updateContainerSensors({
        name: 'container-name',
        watcher: 'watcher-name',
        displayIcon: 'mdi:docker',
    } as Container);
    expect(mqttClientMock.publish).toHaveBeenCalledTimes(15);

    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        1,
        'homeassistant/sensor/topic_total_count/config',
        JSON.stringify({
            unique_id: 'topic_total_count',
            object_id: 'topic_total_count',
            name: 'Total container count',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'topic/total_count',
        }),
        { retain: true },
    );

    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        2,
        'homeassistant/sensor/topic_update_count/config',
        JSON.stringify({
            unique_id: 'topic_update_count',
            object_id: 'topic_update_count',
            name: 'Total container update count',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'topic/update_count',
        }),
        { retain: true },
    );

    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        3,
        'homeassistant/binary_sensor/topic_update_status/config',
        JSON.stringify({
            unique_id: 'topic_update_status',
            object_id: 'topic_update_status',
            name: 'Total container update status',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
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
            object_id: 'topic_watcher-name_total_count',
            name: 'Watcher watcher-name container count',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'topic/watcher-name/total_count',
        }),
        { retain: true },
    );

    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        5,
        'homeassistant/sensor/topic_watcher-name_update_count/config',
        JSON.stringify({
            unique_id: 'topic_watcher-name_update_count',
            object_id: 'topic_watcher-name_update_count',
            name: 'Watcher watcher-name container update count',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'topic/watcher-name/update_count',
        }),
        { retain: true },
    );

    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        6,
        'homeassistant/binary_sensor/topic_watcher-name_update_status/config',
        JSON.stringify({
            unique_id: 'topic_watcher-name_update_status',
            object_id: 'topic_watcher-name_update_status',
            name: 'Watcher watcher-name container update status',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
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
        '{}',
        { retain: true },
    );
    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        14,
        'homeassistant/sensor/topic_watcher-name_update_count/config',
        '{}',
        { retain: true },
    );
    expect(mqttClientMock.publish).toHaveBeenNthCalledWith(
        15,
        'homeassistant/binary_sensor/topic_watcher-name_update_status/config',
        '{}',
        { retain: true },
    );
});

test('removeContainerSensor must publish all sensor removal messages expected by HA', async () => {
    await hass.removeContainerSensor({
        name: 'container-name',
        watcher: 'watcher-name',
        displayIcon: 'mdi:docker',
    } as Container);
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'homeassistant/update/topic_watcher-name_container-name/config',
        JSON.stringify({}),
        { retain: true },
    );
});

test('updateWatcherSensors must publish all watcher sensor messages expected by HA', async () => {
    await hass.updateWatcherSensors({
        watcher: {
            name: 'watcher-name',
        } as Watcher,
        isRunning: true,
    });
    expect(mqttClientMock.publish).toHaveBeenCalledWith(
        'homeassistant/binary_sensor/topic_watcher-name_running/config',
        JSON.stringify({
            unique_id: 'topic_watcher-name_running',
            object_id: 'topic_watcher-name_running',
            name: 'Watcher watcher-name running status',
            device: {
                identifiers: ['wud'],
                manufacturer: 'wud',
                model: 'wud',
                name: 'wud',
                sw_version: 'unknown',
            },
            icon: 'mdi:docker',
            entity_picture:
                'https://github.com/getwud/wud/raw/main/docs/assets/wud-logo-256.png',
            state_topic: 'topic/watcher-name/running',
            payload_on: 'true',
            payload_off: 'false',
        }),
        { retain: true },
    );
});
