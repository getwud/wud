import rp, { RequestPromise } from 'request-promise-native';
import { Gitlab, GitlabConfiguration } from './Gitlab';
import { ContainerImage } from '../../../model/container';


const gitlab = new Gitlab();
gitlab.configuration = {
    url: 'https://registry.gitlab.com',
    authurl: 'https://gitlab.com',
    token: 'abcdef',
};

jest.mock('request-promise-native');

test('validatedConfiguration should initialize when configuration is valid', () => {
    expect(
        gitlab.validateConfiguration({
            token: 'abcdef',
        } as GitlabConfiguration),
    ).toStrictEqual({
        url: 'https://registry.gitlab.com',
        authurl: 'https://gitlab.com',
        token: 'abcdef',
    });
    expect(
        gitlab.validateConfiguration({
            url: 'https://registry.custom.com',
            authurl: 'https://custom.com',
            token: 'abcdef',
        }),
    ).toStrictEqual({
        url: 'https://registry.custom.com',
        authurl: 'https://custom.com',
        token: 'abcdef',
    });
});

test('validatedConfiguration should throw error when no pam', () => {
    expect(() => {
        gitlab.validateConfiguration({} as GitlabConfiguration);
    }).toThrow('"token" is required');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(gitlab.maskConfiguration()).toEqual({
        url: 'https://registry.gitlab.com',
        authurl: 'https://gitlab.com',
        token: 'a****f',
    });
});

test('match should return true when registry url is from gitlab.com', () => {
    expect(
        gitlab.match({
            registry: {
                url: 'gitlab.com',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return true when registry url is from custom gitlab', () => {
    const gitlabCustom = new Gitlab();
    gitlabCustom.configuration = {
        url: 'https://registry.custom.com',
        authurl: 'https://custom.com',
        token: 'abcdef',
    };
    expect(
        gitlabCustom.match({
            registry: {
                url: 'custom.com',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('authenticate should perform authenticate request', () => {
    (rp as unknown as jest.Mock).mockImplementation(() => ({
        token: 'token',
    }));
    expect(
        gitlab.authenticate(
            {} as ContainerImage,
            {
                headers: {},
            },
        ),
    ).resolves.toEqual({ headers: { Authorization: 'Bearer token' } });
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        gitlab.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'registry.gitlab.com',
            },
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://registry.gitlab.com/v2',
        },
    });
});

test('getAuthPull should return pam', () => {
    expect(gitlab.getAuthPull()).toEqual({
        username: '',
        password: gitlab.configuration.token,
    });
});
