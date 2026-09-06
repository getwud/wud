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
});
