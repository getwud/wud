import { requireRole } from './rbac';

describe('RBAC Middleware', () => {
    let req: any;
    let res: any;
    let next: jest.Mock;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
    });

    test('should return 401 when req.user is undefined', () => {
        const middleware = requireRole(['admin']);
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when user does not have allowed role', () => {
        req.user = { id: '1', role: 'ro' };
        const middleware = requireRole(['admin', 'rw']);
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('should allow request when user has allowed role', () => {
        req.user = { id: '1', role: 'admin' };
        const middleware = requireRole(['admin']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should enforce API token scopes for write operations', () => {
        req.user = {
            id: '1',
            role: 'rw',
            token: { scopes: ['read'] },
        };
        const middleware = requireRole(['admin', 'rw'], 'write');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringContaining('missing write scope'),
            }),
        );
        expect(next).not.toHaveBeenCalled();
    });

    test('should allow API token with write scope on write operation', () => {
        req.user = {
            id: '1',
            role: 'admin',
            token: { scopes: ['read', 'write'] },
        };
        const middleware = requireRole(['admin', 'rw'], 'write');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow API token with write scope on read operation', () => {
        req.user = {
            id: '1',
            role: 'rw',
            token: { scopes: ['write'] },
        };
        const middleware = requireRole(['admin', 'rw', 'ro'], 'read');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('should default to read scope for safe methods (GET, HEAD, OPTIONS) when requiredScope is omitted', () => {
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        for (const method of safeMethods) {
            const nextMock = jest.fn();
            const resMock = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
            const reqMock = {
                method,
                user: {
                    id: '1',
                    role: 'ro',
                    token: { scopes: ['read'] },
                },
            };
            const middleware = requireRole(['admin', 'rw', 'ro']);
            middleware(reqMock as any, resMock as any, nextMock);

            expect(nextMock).toHaveBeenCalled();
            expect(resMock.status).not.toHaveBeenCalled();
        }
    });

    test('should reject read-only API token on safe methods if token has no read scope', () => {
        req.method = 'GET';
        req.user = {
            id: '1',
            role: 'ro',
            token: { scopes: [] },
        };
        const middleware = requireRole(['admin', 'rw', 'ro']);
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringContaining('missing read scope'),
            }),
        );
        expect(next).not.toHaveBeenCalled();
    });

    test('should default to write scope for mutating methods (POST, PUT, DELETE, PATCH) when requiredScope is omitted', () => {
        const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        for (const method of mutatingMethods) {
            const nextMock = jest.fn();
            const resMock = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
            const reqMock = {
                method,
                user: {
                    id: '1',
                    role: 'admin',
                    token: { scopes: ['read'] },
                },
            };
            const middleware = requireRole(['admin']);
            middleware(reqMock as any, resMock as any, nextMock);

            expect(resMock.status).toHaveBeenCalledWith(403);
            expect(resMock.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.stringContaining('missing write scope'),
                }),
            );
            expect(nextMock).not.toHaveBeenCalled();
        }
    });

    test('should allow API token with write scope on mutating methods when requiredScope is omitted', () => {
        req.method = 'POST';
        req.user = {
            id: '1',
            role: 'admin',
            token: { scopes: ['write'] },
        };
        const middleware = requireRole(['admin']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail closed (require write scope) if req.method is omitted or unknown', () => {
        req.method = undefined;
        req.user = {
            id: '1',
            role: 'admin',
            token: { scopes: ['read'] },
        };
        const middleware = requireRole(['admin']);
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringContaining('missing write scope'),
            }),
        );
        expect(next).not.toHaveBeenCalled();
    });
});
