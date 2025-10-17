const { ValidationError } = require('joi');
const rp = require('request-promise-native');
const Rocketchat = require('./Rocketchat');
jest.mock('request-promise-native');

const rocketchat = new Rocketchat();

beforeEach(() => {
    jest.resetAllMocks();
});

const COMMON_CONFIGURATION = {
    mode: 'simple',
    threshold: 'all',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',
    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
    batchtitle: '${containers.length} updates available',
};

const VALID_CONFIGURATION = {
    ...COMMON_CONFIGURATION,
    url: 'https://open.rocket.chat',
    user: { id: 'jDdn8oh9BfJKnWdDY' },
    auth: { token: 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx' },
    channel: '#general',
    disabletitle: false,
};

const TEST_CONTAINER = {
    name: 'rocketchat-1',
    updateKind: {
        kind: 'tag',
        localValue: '1.0.0',
        remoteValue: '2.0.0',
    },
};

function createConfiguration(overrides = {}) {
    return { ...VALID_CONFIGURATION, ...overrides };
}

function expectValidationError(configuration) {
    expect(() => {
        rocketchat.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
}

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        rocketchat.validateConfiguration(VALID_CONFIGURATION);
    expect(validatedConfiguration).toStrictEqual(VALID_CONFIGURATION);
});

test('validateConfiguration should throw error when url is missing', () => {
    const configuration = createConfiguration({ url: undefined });
    expectValidationError(configuration);
});

test('validateConfiguration should throw error when url is missing protocol', () => {
    const configuration = createConfiguration({ url: 'open.rocket.chat' });
    expectValidationError(configuration);
});

test('validateConfiguration should throw error when url has invalid protocol', () => {
    const configuration = createConfiguration({
        url: 'git://open.rocket.chat',
    });
    expectValidationError(configuration);
});

test('validateConfiguration should trim trailing slash from url', () => {
    const configuration = createConfiguration({
        url: 'https://open.rocket.chat/',
    });
    const validatedConfiguration =
        rocketchat.validateConfiguration(configuration);
    expect(validatedConfiguration).toStrictEqual(VALID_CONFIGURATION);
});

test('validateConfiguration should throw error when user id is missing', () => {
    const configuration = createConfiguration({ user: { id: undefined } });
    expectValidationError(configuration);
});

test('validateConfiguration should throw error when auth token is missing', () => {
    const configuration = createConfiguration({ auth: { token: undefined } });
    expectValidationError(configuration);
});

test('validateConfiguration should trim auth token', () => {
    const configuration = createConfiguration({
        auth: { token: ' Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx\n' },
    });
    const validatedConfiguration =
        rocketchat.validateConfiguration(configuration);
    expect(validatedConfiguration).toStrictEqual(VALID_CONFIGURATION);
});

test('validateConfiguration should throw error when channel is missing', () => {
    const configuration = createConfiguration({ channel: undefined });
    expectValidationError(configuration);
});

test('maskConfiguration should mask sensitive data', () => {
    rocketchat.configuration = {
        auth: { token: 'token' },
        user: { id: 'some_user_id' },
        channel: '#general',
    };
    expect(rocketchat.maskConfiguration()).toEqual({
        auth: { token: 't***n' },
        user: { id: 's**********d' },
        channel: '#general',
    });
});

test('composeMessage should include title when disabletitle is false', () => {
    rocketchat.configuration = createConfiguration({ disabletitle: false });
    const message = rocketchat.composeMessage(TEST_CONTAINER);
    expect(message).toContain('New tag found for container rocketchat-1');
});

test('composeMessage should not include title when disabletitle is true', () => {
    rocketchat.configuration = createConfiguration({ disabletitle: true });
    const message = rocketchat.composeMessage(TEST_CONTAINER);
    expect(message).not.toContain('New tag found for container rocketchat-1');
});

test('composeBatchMessage should include batch title when disabletitle is false', () => {
    rocketchat.configuration = createConfiguration({ disabletitle: false });
    const message = rocketchat.composeBatchMessage([TEST_CONTAINER]);
    expect(message).toContain('1 updates available');
});

test('composeBatchMessage should not include batch title when disabletitle is true', () => {
    rocketchat.configuration = createConfiguration({ disabletitle: true });
    const message = rocketchat.composeBatchMessage([TEST_CONTAINER]);
    expect(message).not.toContain('1 updates available');
});

test('trigger should call http client', async () => {
    rocketchat.configuration = VALID_CONFIGURATION;
    await rocketchat.trigger(TEST_CONTAINER);

    expect(rp).toHaveBeenCalledWith({
        body: {
            channel: '#general',
            text: 'New tag found for container rocketchat-1\n\nContainer rocketchat-1 running with tag 1.0.0 can be updated to tag 2.0.0',
        },
        headers: {
            'X-Auth-Token': 'Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx',
            'X-User-Id': 'jDdn8oh9BfJKnWdDY',
            'content-type': 'application/json',
            accept: 'application/json',
        },
        method: 'POST',
        json: true,
        uri: 'https://open.rocket.chat/api/v1/chat.postMessage',
    });
});
