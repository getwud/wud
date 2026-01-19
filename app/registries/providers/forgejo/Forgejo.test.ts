// @ts-nocheck
import Forgejo from './Forgejo';

const forgejo = new Forgejo();
forgejo.configuration = {
    login: 'login',
    password: 'password',
    url: 'https://forgejo.acme.com',
};

test('normalizeImage should return the proper registry v2 endpoint', async () => {
    expect(
        forgejo.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'forgejo.acme.com/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://forgejo.acme.com/v2',
        },
    });
});
