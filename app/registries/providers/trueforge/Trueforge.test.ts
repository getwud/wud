// @ts-nocheck
import Trueforge from './Trueforge';

jest.mock('axios', () =>
    jest.fn().mockImplementation(() => ({
        data: { token: 'xxxxx' },
    })),
);

const trueforge = new Trueforge();
trueforge.configuration = {
    username: 'user',
    token: 'token',
};

jest.mock('axios');

test('validatedConfiguration should initialize when configuration is valid', async () => {
    expect(
        trueforge.validateConfiguration({
            username: 'user',
            token: 'token',
        }),
    ).toStrictEqual({
        username: 'user',
        token: 'token',
    });
});

test('validatedConfiguration should throw error when configuration is missing', async () => {
    expect(() => {
        trueforge.validateConfiguration({});
    }).toThrow('"username" is required');
});

test('match should return true when registry url is from trueforge', async () => {
    expect(
        trueforge.match({
            registry: {
                url: 'oci.trueforge.org',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from trueforge', async () => {
    expect(
        trueforge.match({
            registry: {
                url: 'wrong.io',
            },
        }),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
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
