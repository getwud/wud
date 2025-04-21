import { Authentication } from './Authentication';
import { Express } from 'express';

test('init should call initAuthentication', async () => {
    const authentication = new Authentication();
    const spy = jest.spyOn(authentication, 'initAuthentication');
    await authentication.init();
    expect(spy).toHaveBeenCalled();
});

test('getStrategy throw an error by default', async () => {
    const authentication = new Authentication();
    expect(() => authentication.getStrategy({} as Express)).toThrow(
        'getStrategy must be implemented',
    );
});
