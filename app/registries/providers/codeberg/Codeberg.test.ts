import Codeberg from './Codeberg';

const codeberg = new Codeberg();
codeberg.configuration = {
    login: 'john',
    password: 'doe',
} as any;
codeberg.init();

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        codeberg.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'codeberg.org/test/image',
            },
        } as any),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://codeberg.org/v2',
        },
    });
});
