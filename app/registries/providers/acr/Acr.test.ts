import { ContainerImage } from '../../../model/container';
import { Acr, AcrConfiguration } from './Acr';

const acr = new Acr();
acr.configuration = {
    clientid: 'clientid',
    clientsecret: 'clientsecret',
};

test('validatedConfiguration should initialize when configuration is valid', () => {
    expect(
        acr.validateConfiguration({
            clientid: 'clientid',
            clientsecret: 'clientsecret',
        }),
    ).toStrictEqual({
        clientid: 'clientid',
        clientsecret: 'clientsecret',
    });
});

test('validatedConfiguration should throw error when configuration item is missing', () => {
    expect(() => {
        acr.validateConfiguration({} as AcrConfiguration);
    }).toThrow('"clientid" is required');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(acr.maskConfiguration()).toEqual({
        clientid: 'clientid',
        clientsecret: 'c**********t',
    });
});

test('match should return true when registry url is from acr', () => {
    expect(
        acr.match({
            registry: {
                url: 'test.azurecr.io',
            },
        } as ContainerImage),
    ).toBeTruthy();
});

test('match should return false when registry url is not from acr', () => {
    expect(
        acr.match({
            registry: {
                url: 'est.notme.io',
            },
        } as ContainerImage),
    ).toBeFalsy();
});

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        acr.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'test.azurecr.io/test/image',
            },
        } as ContainerImage),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://test.azurecr.io/test/image/v2',
        },
    });
});

test('authenticate should add basic auth', () => {
    expect(acr.authenticate({} as ContainerImage, { headers: {} })).resolves.toEqual({
        headers: {
            Authorization: 'Basic Y2xpZW50aWQ6Y2xpZW50c2VjcmV0',
        },
    });
});
