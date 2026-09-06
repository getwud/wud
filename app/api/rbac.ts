import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../store/user';
import { ApiTokenScope } from '../store/token';

/**
 * Middleware to require one of the specified roles,
 * and if an API token is used, enforce that the required scope is granted.
 */
export function requireRole(
    allowedRoles: UserRole[],
    requiredScope?: ApiTokenScope,
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !user.role) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 1. Check user role against allowed roles
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                error: `Forbidden: role '${user.role}' has insufficient permissions`,
            });
        }

        // 2. If request authenticated via an API token, verify scope
        if (user.token && requiredScope) {
            const tokenScopes: ApiTokenScope[] = user.token.scopes || [];
            if (requiredScope === 'write') {
                if (!tokenScopes.includes('write')) {
                    return res.status(403).json({
                        error: 'Forbidden: API token missing write scope',
                    });
                }
            } else if (requiredScope === 'read') {
                if (
                    !tokenScopes.includes('read') &&
                    !tokenScopes.includes('write')
                ) {
                    return res.status(403).json({
                        error: 'Forbidden: API token missing read scope',
                    });
                }
            }
        }

        return next();
    };
}
