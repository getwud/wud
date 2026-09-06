import express from 'express';
import {
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    getUserByUsername,
    countAdminUsers,
    UserRole,
} from '../store/user';
import { requireRole } from './rbac';

/**
 * User administration router (Admin only).
 */
export function init() {
    const router = express.Router();

    // All routes require Admin role
    router.use(requireRole(['admin']));

    // List all users
    router.get('/', async (req, res) => {
        try {
            const users = await listUsers();
            res.json(users);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Create a new user
    router.post('/', async (req, res) => {
        try {
            const { username, password, role } = req.body;
            if (!username || !password) {
                return res
                    .status(400)
                    .json({ error: 'Username and password are required' });
            }

            const existing = await getUserByUsername(username);
            if (existing) {
                return res
                    .status(409)
                    .json({ error: `User '${username}' already exists` });
            }

            const allowedRoles: UserRole[] = ['admin', 'rw', 'ro'];
            const userRole: UserRole = allowedRoles.includes(role)
                ? role
                : 'ro';

            const created = await createUser({
                username,
                password,
                role: userRole,
                provider: 'local',
            });

            const { passwordHash, ...safeUser } = created;
            res.status(201).json(safeUser);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Update a user (role or password)
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { role, password } = req.body;

            const existing = await getUserById(id);
            if (!existing) {
                return res.status(404).json({ error: 'User not found' });
            }

            // If demoting from admin, verify there is at least one other admin
            if (role && role !== 'admin' && existing.role === 'admin') {
                const adminCount = await countAdminUsers();
                if (adminCount <= 1) {
                    return res.status(400).json({
                        error: 'Cannot demote the last remaining administrator',
                    });
                }
            }

            const updateData: { role?: UserRole; password?: string } = {};
            if (role && ['admin', 'rw', 'ro'].includes(role)) {
                updateData.role = role;
            }
            if (password) {
                updateData.password = password;
            }

            const updated = await updateUser(id, updateData);
            const { passwordHash, ...safeUser } = updated;
            res.json(safeUser);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Delete a user
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const currentUser = (req as any).user;

            if (currentUser && currentUser.id === id) {
                return res
                    .status(400)
                    .json({ error: 'Cannot delete your own account' });
            }

            const existing = await getUserById(id);
            if (!existing) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (existing.role === 'admin') {
                const adminCount = await countAdminUsers();
                if (adminCount <= 1) {
                    return res.status(400).json({
                        error: 'Cannot delete the last remaining administrator',
                    });
                }
            }

            await deleteUser(id);
            res.sendStatus(204);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    return router;
}
