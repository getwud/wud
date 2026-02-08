const Codeberg = require('./CodebergCodeberg');

const codeberg = new Codeberg();

codeberg.configuration = {
    public: '',
};

test('normalizeImage should return the proper registry v2 endpoint', () => {
    expect(
        codeberg.normalizeImage({
            name: 'codeberg.org/forgejo/forgejo',
            registry: {
                url: 'codeberg.org/forgejo/forgejo',
            },
        }),
    ).toStrictEqual({
        name: 'test/image',
        registry: {
            url: 'https://codeberg.org/v2',
        },
    });
});
