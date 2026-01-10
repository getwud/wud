// @ts-nocheck
import axios from 'axios';
import Gitlab from './Gitlab';

const gitlab = new Gitlab();
gitlab.configuration = {
    url: 'https://registry.gitlab.com',
    authurl: 'https://gitlab.com',
    token: 'abcdef',
};

jest.mock('axios');

test('validatedConfiguration should initialize when configuration is valid', async () => {
    expect(
        gitlab.validateConfiguration({
            token: 'abcdef',
        }),
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

test('validatedConfiguration should throw error when no pam', async () => {
    expect(() => {
        gitlab.validateConfiguration({});
    }).toThrow('"token" is required');
});

test('maskConfiguration should mask configuration secrets', async () => {
    expect(gitlab.maskConfiguration()).toEqual({
        url: 'https://registry.gitlab.com',
        authurl: 'https://gitlab.com',
        token: 'a****f',
    });
});

test('match should return true when registry url is from gitlab.com', async () => {
    expect(
        gitlab.match({
            registry: {
                url: 'gitlab.com',
            },
        }),
    ).toBeTruthy();
});

test('match should return true when registry url is from custom gitlab', async () => {
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
        }),
    ).toBeTruthy();
});

test('authenticate should perform authenticate request', async () => {
    axios.mockImplementation(() => ({
        data: {
            token: 'token',
        },
    }));
    expect(
        gitlab.authenticate(
            {},
            {
                headers: {},
            },
        ),
    ).resolves.toEqual({ headers: { Authorization: 'Bearer token' } });
});

test('normalizeImage should return the proper registry v2 endpoint', async () => {
    expect(
        gitlab.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'registry.gitlab.com',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://registry.gitlab.com/v2',
        },
    });
});

test('getAuthPull should return pam', async () => {
    expect(gitlab.getAuthPull()).toEqual({
        username: '',
        password: gitlab.configuration.token,
    });
});
