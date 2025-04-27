import { ContainerImage } from '../../../model/container';
import { Gitea } from './Gitea';

const gitea = new Gitea();
gitea.configuration = {
    login: 'login',
    password: 'password',
    url: 'https://gitea.acme.com',
};

test('validatedConfiguration should initialize when configuration is valid', () => {
    expect(
        gitea.validateConfiguration({
            url: 'https://gitea.acme.com',
            login: 'login',
            password: 'password',
        }),
    ).toStrictEqual({
        url: 'https://gitea.acme.com',
        login: 'login',
        password: 'password',
    });
});

test('validatedConfiguration should throw error when auth is not base64', () => {
    expect(() => {
        gitea.validateConfiguration({
            url: 'https://gitea.acme.com',
            auth: '°°°',
        });
    }).toThrow('"auth" must be a valid base64 string');
});

test('match should return true when registry url is from gitea', () => {
    expect(
        gitea.match({
            registry: {
                url: 'gitea.acme.com',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from custom', () => {
    expect(
        gitea.match({
            registry: {
                url: 'gitea.notme.io',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        gitea.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'gitea.acme.com/test/image',
            },
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://gitea.acme.com/v2',
        },
    });
});
