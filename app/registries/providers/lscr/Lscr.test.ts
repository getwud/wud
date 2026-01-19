// @ts-nocheck
import Lscr from './Lscr';

jest.mock('axios', () =>
    jest.fn().mockImplementation(() => ({
        data: { token: 'xxxxx' },
    })),
);

const lscr = new Lscr();
lscr.configuration = {
    username: 'user',
    token: 'token',
};

jest.mock('axios');

test('validatedConfiguration should initialize when configuration is valid', async () => {
    expect(
        lscr.validateConfiguration({
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
        lscr.validateConfiguration({});
    }).toThrow('"username" is required');
});

test('match should return true when registry url is from lscr', async () => {
    expect(
        lscr.match({
            registry: {
                url: 'lscr.io',
            },
        }),
    ).toBeTruthy();
});

test('match should return false when registry url is not from lscr', async () => {
    expect(
        lscr.match({
            registry: {
                url: 'wrong.io',
            },
        }),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
    expect(
        lscr.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'lscr.io/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://lscr.io/test/image/v2',
        },
    });
});
