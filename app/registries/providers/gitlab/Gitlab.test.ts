// @ts-nocheck
import axios from 'axios';
import Gitlab from './Gitlab';

const gitlab = new Gitlab();
gitlab.configuration = {
    url: 'https://registry.gitlab.com',
    authurl: 'https://gitlab.com',
    username: '',
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
        username: '',
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
        username: '',
        token: 'abcdef',
    });
    expect(
        gitlab.validateConfiguration({
            username: 'custom-user',
            token: 'abcdef',
        }),
    ).toStrictEqual({
        url: 'https://registry.gitlab.com',
        authurl: 'https://gitlab.com',
        username: 'custom-user',
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
        username: '',
        token: 'a****f',
    });
});

test('match should return true when registry url is from gitlab.com', async () => {
    expect(gitlab.match('gitlab.com')).toBeTruthy();
});

test('match should return true when registry url is from custom gitlab', async () => {
    const gitlabCustom = new Gitlab();
    gitlabCustom.configuration = {
        url: 'https://registry.custom.com',
        authurl: 'https://custom.com',
        token: 'abcdef',
    };
    expect(gitlabCustom.match('custom.com')).toBeTruthy();
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

test('authenticate should use custom username when configured', async () => {
    const gitlabCustom = new Gitlab();
    gitlabCustom.configuration = {
        url: 'https://registry.gitlab.com',
        authurl: 'https://gitlab.com',
        username: 'custom-user',
        token: 'abcdef',
    };
    axios.mockClear();
    axios.mockImplementation(() => ({
        data: {
            token: 'token',
        },
    }));

    await expect(
        gitlabCustom.authenticate(
            { name: 'test/image' },
            {
                headers: {},
            },
        ),
    ).resolves.toEqual({ headers: { Authorization: 'Bearer token' } });
    expect(axios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://gitlab.com/jwt/auth?service=container_registry&scope=repository:test/image:pull',
        headers: {
            Accept: 'application/json',
            Authorization: `Basic ${Gitlab.base64Encode('custom-user', 'abcdef')}`,
        },
    });
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
    await expect(gitlab.getAuthPull()).resolves.toEqual({
        username: '',
        password: gitlab.configuration.token,
    });
});

test('getAuthPull should return custom username', async () => {
    const gitlabCustom = new Gitlab();
    gitlabCustom.configuration = {
        username: 'custom-user',
        token: 'abcdef',
    };

    await expect(gitlabCustom.getAuthPull()).resolves.toEqual({
        username: 'custom-user',
        password: 'abcdef',
    });
});
