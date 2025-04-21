import { Issuer } from 'openid-client';
import { OidcStrategy } from './OidcStrategy';
import log from '../../../log';

const { Client } = new Issuer({ issuer: 'issuer' });
const client = new Client({ client_id: '123456789' });
const oidcStrategy = new OidcStrategy({ client }, () => { }, log) as any;

beforeEach(() => {
    oidcStrategy.success = jest.fn();
    oidcStrategy.fail = jest.fn();
});

test('authenticate should return user from session if so', () => {
    oidcStrategy.authenticate({ isAuthenticated: () => true });
    expect(oidcStrategy.success).toHaveBeenCalled();
});

test('authenticate should call super.authenticate when no existing session', () => {
    const fail = jest.spyOn(oidcStrategy, 'fail');
    oidcStrategy.authenticate({ isAuthenticated: () => false, headers: {} });
    expect(fail).toHaveBeenCalled();
});

test('authenticate should get & validate Bearer token', () => {
    const verify = jest.spyOn(oidcStrategy, 'verify');
    oidcStrategy.authenticate({
        isAuthenticated: () => false,
        headers: {
            authorization: 'Bearer XXXXX',
        },
    });
    expect(verify).toHaveBeenCalledWith('XXXXX', expect.any(Function));
});
