const Trueforge = require('./Trueforge');

jest.mock('axios', () =>
    jest.fn().mockImplementation(() => ({
        data: { token: 'xxxxx' },
    })),
);

const trueforge = new Trueforge();
trueforge.configuration = {
    namespace: 'namespace',
    account: 'account',
    token: 'token',
};

jest.mock('axios');

test('validatedConfiguration should initialize when anonymous configuration is valid', () => {
    expect(trueforge.validateConfiguration('')).toStrictEqual({});
    expect(trueforge.validateConfiguration(undefined)).toStrictEqual({});
});

test('validatedConfiguration should initialize when auth configuration is valid', () => {
    expect(
        trueforge.validateConfiguration({
            namespace: 'namespace',
            account: 'account',
            token: 'token',
        }),
    ).toStrictEqual({
        namespace: 'namespace',
        account: 'account',
        token: 'token',
    });
});

test('validatedConfiguration should throw error when configuration is missing', () => {
    expect(() => {
        trueforge.validateConfiguration({});
    }).toThrow('"namespace" is required');
});

test('match should return true when registry url is from trueforge', () => {
    expect(
        trueforge.match({
            registry: {
                url: 'oci.trueforge.org',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from trueforge', () => {
    expect(
        trueforge.match({
            registry: {
                url: 'wrong.io',
            },
        }),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        trueforge.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'oci.trueforge.org/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://oci.trueforge.org/test/image/v2',
        },
    });
});
