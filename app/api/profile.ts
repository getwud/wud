import express from 'express';
import {
    getUserById,
    updateUser,
    verifyPassword,
    UserPreferences,
} from '../store/user';
import {
    createToken,
    listTokensForUser,
    deleteToken,
    ApiTokenScope,
} from '../store/token';
import { requireRole } from './rbac';

/**
 * Profile & Token management router for authenticated users.
 */
export function init() {
    const router = express.Router();

    // Available to all authenticated roles
    router.use(requireRole(['admin', 'rw', 'ro']));

    // Get current profile
    router.get('/', async (req, res) => {
        try {
            const user = (req as any).user;
            const fullUser = await getUserById(user.id);
            if (!fullUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            const { passwordHash, ...safeUser } = fullUser;
            res.json(safeUser);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Update preferences (e.g. theme)
    router.put('/preferences', async (req, res) => {
        try {
            const user = (req as any).user;
            const preferences: UserPreferences =
                req.body.preferences || req.body;

            const updated = await updateUser(user.id, { preferences });
            // Update session user preferences if present
            if ((req as any).user) {
                (req as any).user.preferences = updated.preferences;
            }
            const { passwordHash, ...safeUser } = updated;
            res.json(safeUser);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Change password (local provider only)
    router.put('/password', async (req, res) => {
        try {
            const user = (req as any).user;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    error: 'Current password and new password are required',
                });
            }

            const fullUser = await getUserById(user.id);
            if (
                !fullUser ||
                fullUser.provider !== 'local' ||
                !fullUser.passwordHash
            ) {
                return res.status(400).json({
                    error: 'Password can only be updated for local accounts',
                });
            }

            const valid = await verifyPassword(
                currentPassword,
                fullUser.passwordHash,
            );
            if (!valid) {
                return res
                    .status(400)
                    .json({ error: 'Current password is incorrect' });
            }

            await updateUser(user.id, { password: newPassword });
            res.json({ message: 'Password updated successfully' });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // List user API tokens
    router.get('/tokens', async (req, res) => {
        try {
            const user = (req as any).user;
            const tokens = await listTokensForUser(user.id);
            res.json(tokens);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Create a new API token
    router.post('/tokens', async (req, res) => {
        try {
            const user = (req as any).user;
            const { name, scopes, expiresAt } = req.body;

            if (!name) {
                return res
                    .status(400)
                    .json({ error: 'Token name is required' });
            }

            const tokenScopes: ApiTokenScope[] = Array.isArray(scopes)
                ? scopes
                : ['read'];

            // Scope restriction: Read-Only users cannot create write tokens
            if (user.role === 'ro' && tokenScopes.includes('write')) {
                return res.status(403).json({
                    error: 'Read-only users cannot create API tokens with write permissions',
                });
            }

            const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

            const result = await createToken({
                userId: user.id,
                name,
                scopes: tokenScopes,
                expiresAt: parsedExpiresAt,
            });

            res.status(201).json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Revoke an API token
    router.delete('/tokens/:id', async (req, res) => {
        try {
            const user = (req as any).user;
            const { id } = req.params;
            await deleteToken(id, user.id);
            res.sendStatus(204);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    return router;
}
