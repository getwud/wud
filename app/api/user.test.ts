import express from 'express';
import request from 'supertest';
import * as userRouter from './user';
import * as userStore from '../store/user';

jest.mock('../store/user', () => ({
    listUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserById: jest.fn(),
    getUserByUsername: jest.fn(),
    countAdminUsers: jest.fn(),
}));

describe('User API Router', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());

        // Attach default admin user for authentication simulation
        app.use((req: any, _res, next) => {
            req.user = { id: 'admin1', username: 'admin', role: 'admin' };
            next();
        });

        app.use('/users', userRouter.init());
    });

    test('GET /users should list all users', async () => {
        (userStore.listUsers as jest.Mock).mockResolvedValue([
            { id: '1', username: 'user1', role: 'ro' },
            { id: '2', username: 'user2', role: 'admin' },
        ]);

        const res = await request(app).get('/users');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        expect(userStore.listUsers).toHaveBeenCalled();
    });

    test('POST /users should create a user', async () => {
        (userStore.getUserByUsername as jest.Mock).mockResolvedValue(null);
        (userStore.createUser as jest.Mock).mockResolvedValue({
            id: 'new1',
            username: 'newuser',
            role: 'rw',
            provider: 'local',
            passwordHash: 'hash123',
        });

        const res = await request(app)
            .post('/users')
            .send({ username: 'newuser', password: 'password', role: 'rw' });

        expect(res.status).toBe(201);
        expect(res.body.username).toBe('newuser');
        expect(res.body.passwordHash).toBeUndefined();
    });

    test('POST /users should reject duplicate username', async () => {
        (userStore.getUserByUsername as jest.Mock).mockResolvedValue({
            id: 'existing',
        });

        const res = await request(app)
            .post('/users')
            .send({ username: 'existing', password: 'password' });

        expect(res.status).toBe(409);
    });

    test('PUT /users/:id should update user', async () => {
        (userStore.getUserById as jest.Mock).mockResolvedValue({
            id: 'u1',
            username: 'user1',
            role: 'ro',
        });
        (userStore.updateUser as jest.Mock).mockResolvedValue({
            id: 'u1',
            username: 'user1',
            role: 'rw',
            passwordHash: 'hash',
        });

        const res = await request(app).put('/users/u1').send({ role: 'rw' });

        expect(res.status).toBe(200);
        expect(res.body.role).toBe('rw');
    });

    test('PUT /users/:id should prevent demoting the last admin', async () => {
        (userStore.getUserById as jest.Mock).mockResolvedValue({
            id: 'admin1',
            username: 'admin',
            role: 'admin',
        });
        (userStore.countAdminUsers as jest.Mock).mockResolvedValue(1);

        const res = await request(app)
            .put('/users/admin1')
            .send({ role: 'ro' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/last remaining administrator/);
    });

    test('DELETE /users/:id should delete user', async () => {
        (userStore.getUserById as jest.Mock).mockResolvedValue({
            id: 'u2',
            username: 'other',
            role: 'ro',
        });

        const res = await request(app).delete('/users/u2');
        expect(res.status).toBe(204);
        expect(userStore.deleteUser).toHaveBeenCalledWith('u2');
    });

    test('DELETE /users/:id should prevent deleting own account', async () => {
        const res = await request(app).delete('/users/admin1');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Cannot delete your own account/);
    });
});
