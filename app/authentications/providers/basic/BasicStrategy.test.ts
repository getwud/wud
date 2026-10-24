// @ts-nocheck
import BasicStrategy from './BasicStrategy';

describe('BasicStrategy', () => {
    let basicStrategy;
    let verifyMock;

    beforeEach(() => {
        verifyMock = jest.fn((user, pass, done) => {
            if (user === 'admin' && pass === 'p:a:s:s:123') {
                return done(null, { username: 'admin' });
            }
            if (user === 'error_user') {
                return done(new Error('DB failure'));
            }
            return done(null, false);
        });
        basicStrategy = new BasicStrategy({}, verifyMock);
        basicStrategy.success = jest.fn();
        basicStrategy.fail = jest.fn();
        basicStrategy.error = jest.fn();
    });

    test('_challenge should return appropriate Auth header', () => {
        expect(basicStrategy._challenge()).toEqual(401);
    });

    test('authenticate should return user from session if authenticated', () => {
        basicStrategy.authenticate({
            isAuthenticated: () => true,
            user: { username: 'test-user' },
        });
        expect(basicStrategy.success).toHaveBeenCalledWith({
            username: 'test-user',
        });
    });

    test('authenticate should correctly preserve colons in password (RFC 7617)', () => {
        const credentialsBase64 =
            Buffer.from('admin:p:a:s:s:123').toString('base64');
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${credentialsBase64}`,
            },
        });
        expect(verifyMock).toHaveBeenCalledWith(
            'admin',
            'p:a:s:s:123',
            expect.any(Function),
        );
        expect(basicStrategy.success).toHaveBeenCalledWith({
            username: 'admin',
        });
    });

    test('authenticate should fail challenge when no authorization header is present', () => {
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {},
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(401);
    });

    test('authenticate should fail with 400 when authorization header has fewer than 2 parts', () => {
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: 'Basic',
            },
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(400);
    });

    test('authenticate should fail challenge when scheme is not Basic', () => {
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: 'Bearer token123',
            },
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(401);
    });

    test('authenticate should fail with 400 when decoded credentials contain no colon', () => {
        const invalidBase64 = Buffer.from('nocolon').toString('base64');
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${invalidBase64}`,
            },
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(400);
    });

    test('authenticate should fail challenge when username or password is empty', () => {
        const emptyPassBase64 = Buffer.from('admin:').toString('base64');
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${emptyPassBase64}`,
            },
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(401);

        const emptyUserBase64 = Buffer.from(':secret').toString('base64');
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${emptyUserBase64}`,
            },
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(401);
    });

    test('authenticate should call fail when verify callback returns false user', () => {
        const credentialsBase64 = Buffer.from('wrong:creds').toString('base64');
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${credentialsBase64}`,
            },
        });
        expect(basicStrategy.fail).toHaveBeenCalledWith(401);
    });

    test('authenticate should call error when verify callback returns an error', () => {
        const credentialsBase64 =
            Buffer.from('error_user:any').toString('base64');
        basicStrategy.authenticate({
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${credentialsBase64}`,
            },
        });
        expect(basicStrategy.error).toHaveBeenCalledWith(expect.any(Error));
    });

    test('authenticate should pass request to verify when passReqToCallback is true', () => {
        const customVerify = jest.fn((req, user, pass, done) =>
            done(null, { username: user }),
        );
        const reqStrategy = new BasicStrategy(
            { passReqToCallback: true },
            customVerify,
        );
        reqStrategy.success = jest.fn();
        const credentialsBase64 =
            Buffer.from('admin:pass:word').toString('base64');
        const req = {
            isAuthenticated: () => false,
            headers: {
                authorization: `Basic ${credentialsBase64}`,
            },
        };
        reqStrategy.authenticate(req);
        expect(customVerify).toHaveBeenCalledWith(
            req,
            'admin',
            'pass:word',
            expect.any(Function),
        );
        expect(reqStrategy.success).toHaveBeenCalledWith({ username: 'admin' });
    });
});
