const mqtt = require('mqtt');
const assert = require('assert');
const {
    Given,
    Then,
    AfterAll,
    setDefaultTimeout,
} = require('@cucumber/cucumber');
const configuration = require('../../config');

setDefaultTimeout(20 * 1000);

let client = null;
const receivedMessages = new Map();
const waitingListeners = [];

function getValueByPath(obj, path) {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    return keys.reduce((curr, key) => {
        if (curr === undefined || curr === null) {
            return undefined;
        }
        return curr[key];
    }, obj);
}

function getMqttClient() {
    return new Promise((resolve, reject) => {
        if (client && client.connected) {
            resolve(client);
            return;
        }

        const brokerUrl = configuration.mqttUrl;
        client = mqtt.connect(brokerUrl, {
            clientId: `wud_e2e_${Math.random().toString(16).substring(2, 8)}`,
            clean: true,
            connectTimeout: 5000,
        });

        client.on('connect', () => {
            client.subscribe('#', { qos: 0 }, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                setTimeout(() => resolve(client), 500);
            });
        });

        client.on('message', (topic, message) => {
            const payload = message.toString();
            receivedMessages.set(topic, payload);

            for (let i = waitingListeners.length - 1; i >= 0; i -= 1) {
                const listener = waitingListeners[i];
                if (listener.topic === topic) {
                    listener.resolve(payload);
                    waitingListeners.splice(i, 1);
                }
            }
        });

        client.on('error', (err) => {
            reject(err);
        });
    });
}

function waitForMessage(topic, timeoutMs = 3000) {
    if (receivedMessages.has(topic)) {
        return Promise.resolve(receivedMessages.get(topic));
    }

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const index = waitingListeners.findIndex(
                (l) => l.topic === topic && l.resolve === resolve,
            );
            if (index !== -1) {
                waitingListeners.splice(index, 1);
            }
            reject(new Error(`Timeout waiting for MQTT message on topic: ${topic}`));
        }, timeoutMs);

        waitingListeners.push({
            topic,
            resolve: (val) => {
                clearTimeout(timer);
                resolve(val);
            },
        });
    });
}

Given(/^I connect to the MQTT broker$/, async () => {
    await getMqttClient();
});

Then(/^an MQTT message should be published on topic "([^"]*)"$/, async (topic) => {
    const payload = await waitForMessage(topic);
    assert(payload !== undefined, `Expected message on topic ${topic}`);
});

Then(/^no MQTT message should be published on topic "([^"]*)"$/, (topic) => {
    assert(
        !receivedMessages.has(topic),
        `Expected no message on topic ${topic}, but received: ${receivedMessages.get(topic)}`,
    );
});

Then(/^the MQTT message on topic "([^"]*)" should equal "([^"]*)"$/, async (topic, expected) => {
    const payload = await waitForMessage(topic);
    assert.strictEqual(payload, expected, `Topic ${topic} expected "${expected}" but got "${payload}"`);
});

Then(/^the MQTT message on topic "([^"]*)" should match "([^"]*)"$/, async (topic, regexStr) => {
    const payload = await waitForMessage(topic);
    const regex = new RegExp(regexStr);
    assert(regex.test(payload), `Topic ${topic} payload "${payload}" does not match regex "${regexStr}"`);
});

Then(/^the MQTT message on topic "([^"]*)" should be valid json$/, async (topic) => {
    const payload = await waitForMessage(topic);
    try {
        JSON.parse(payload);
    } catch (e) {
        assert.fail(`Topic ${topic} payload is not valid JSON: ${payload}`);
    }
});

Then(/^the MQTT message on topic "([^"]*)" path "([^"]*)" should be "([^"]*)"$/, async (topic, path, expected) => {
    const payload = await waitForMessage(topic);
    const json = JSON.parse(payload);
    const actual = getValueByPath(json, path);
    assert.strictEqual(
        String(actual),
        expected,
        `Topic ${topic} at path "${path}" expected "${expected}" but got "${actual}"`,
    );
});

Then(/^the MQTT message on topic "([^"]*)" path "([^"]*)" should be (true|false|\d+(?:\.\d+)?)$/, async (topic, path, expected) => {
    const payload = await waitForMessage(topic);
    const json = JSON.parse(payload);
    const actual = getValueByPath(json, path);
    let expectedTyped;
    if (expected === 'true') {
        expectedTyped = true;
    } else if (expected === 'false') {
        expectedTyped = false;
    } else {
        expectedTyped = Number(expected);
    }
    assert.strictEqual(
        actual,
        expectedTyped,
        `Topic ${topic} at path "${path}" expected ${expectedTyped} but got ${actual}`,
    );
});

Then(/^the MQTT message on topic "([^"]*)" path "([^"]*)" should contain "([^"]*)"$/, async (topic, path, expected) => {
    const payload = await waitForMessage(topic);
    const json = JSON.parse(payload);
    const actual = getValueByPath(json, path);
    assert(
        String(actual).includes(expected),
        `Topic ${topic} at path "${path}" value "${actual}" does not contain "${expected}"`,
    );
});

AfterAll(async () => {
    if (client) {
        await new Promise((resolve) => {
            client.end(false, resolve);
        });
        client = null;
    }
});
