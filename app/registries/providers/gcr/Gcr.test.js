const Gcr = require('./Gcr');

jest.mock('request-promise-native', () =>
    jest.fn().mockImplementation(() => ({
        token: 'xxxxx',
    })),
);

const gcr = new Gcr();
gcr.configuration = {
    clientemail: 'accesskeyid',
    privatekey: 'secretaccesskey',
};

jest.mock('request-promise-native');

test('validatedConfiguration should initialize when configuration is valid', () => {
    expect(
        gcr.validateConfiguration({
            clientemail: 'accesskeyid',
            privatekey: 'secretaccesskey',
        }),
    ).toStrictEqual({
        clientemail: 'accesskeyid',
        privatekey: 'secretaccesskey',
    });
});

test('validatedConfiguration should throw error when configuration is missing', () => {
    expect(() => {
        gcr.validateConfiguration({});
    }).toThrow('"clientemail" is required');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(gcr.maskConfiguration()).toEqual({
        clientemail: 'accesskeyid',
        privatekey: 's*************y',
    });
});

test('match should return true when registry url is from gcr', () => {
    expect(
        gcr.match({
            registry: {
                url: 'gcr.io',
            },
        }),
    ).toBeTruthy();
    expect(
        gcr.match({
            registry: {
                url: 'us.gcr.io',
            },
        }),
    ).toBeTruthy();
    expect(
        gcr.match({
            registry: {
                url: 'eu.gcr.io',
            },
        }),
    ).toBeTruthy();
    expect(
        gcr.match({
            registry: {
                url: 'asia.gcr.io',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from gcr', () => {
    expect(
        gcr.match({
            registry: {
                url: 'grr.io',
            },
        }),
    ).toBeFalsy();
    expect(gcr.match('gcr.io')).toBeTruthy();
    expect(gcr.match('us.gcr.io')).toBeTruthy();
    expect(gcr.match('eu.gcr.io')).toBeTruthy();
    expect(gcr.match('asia.gcr.io')).toBeTruthy();
});

test('match should return false when registry url is not from gcr', () => {
    expect(gcr.match('grr.io')).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        gcr.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'eu.gcr.io/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://eu.gcr.io/test/image/v2',
        },
    });
});

test('authenticate should call ecr auth endpoint', () => {
    expect(gcr.authenticate({}, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Bearer xxxxx',
        },
    });
});
