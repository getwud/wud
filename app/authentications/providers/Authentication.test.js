const Authentication = require('./Authentication');

test('init should call initAuthentication', async () => {
    const authentication = new Authentication();
    const spy = jest.spyOn(authentication, 'initAuthentication');
    await authentication.init();
    expect(spy).toHaveBeenCalled();
});

test('getStrategy throw an error by default', async () => {
    const authentication = new Authentication();
    expect(() => authentication.getStrategy()).toThrow(
        'getStrategy must be implemented',
    );
});
