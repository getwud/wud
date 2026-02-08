const Codeberg = require('./Codeberg');

const codeberg = new Codeberg();
codeberg.configuration = {
    login: 'john',
    password: 'doe',
};
codeberg.init();

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        codeberg.normalizeImage({
            name: 'test/image',
            registry: {
                url: 'codeberg.org/test/image',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://codeberg.org/v2',
        },
    });
});
