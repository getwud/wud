import { ContainerImage } from '../../../model/container';
import { GhcrConfiguration } from '../ghcr/Ghcr';
import { Lscr } from './Lscr';

jest.mock('request-promise-native', () =>
    jest.fn().mockImplementation(() => ({
        token: 'xxxxx',
    })),
);

const lscr = new Lscr();
lscr.configuration = {
    username: 'user',
    token: 'token',
};

jest.mock('request-promise-native');

test('validatedConfiguration should initialize when configuration is valid', () => {
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

test('validatedConfiguration should throw error when configuration is missing', () => {
    expect(() => {
        lscr.validateConfiguration({} as GhcrConfiguration);
    }).toThrow('"username" is required');
});

test('match should return true when registry url is from lscr', () => {
    expect(
        lscr.match({
            registry: {
                url: 'lscr.io',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from lscr', () => {
    expect(
        lscr.match({
            registry: {
                url: 'wrong.io',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        lscr.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'lscr.io/test/image',
            },
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://lscr.io/test/image/v2',
        },
    });
});
