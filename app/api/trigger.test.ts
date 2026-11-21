import express from 'express';
import request from 'supertest';
import * as trigger from './trigger';

const mockTestTrigger = jest.fn().mockResolvedValue(true);
const mockFailTrigger = jest.fn().mockRejectedValue(new Error('fail error'));
const mockDockerTrigger = jest.fn().mockResolvedValue(true);
const mockLegacyTrigger = jest.fn().mockResolvedValue(true);

jest.mock('../registry', () => ({
    getState: jest.fn(() => ({
        trigger: {
            'mock.test': {
                type: 'mock',
                name: 'test',
                maskConfiguration: () => ({ mockConfig: true }),
                supportsSimulation: () => true,
                trigger: mockTestTrigger,
            },
            'mock.fail': {
                type: 'mock',
                name: 'fail',
                maskConfiguration: () => ({ mockConfig: true }),
                supportsSimulation: () => true,
                trigger: mockFailTrigger,
            },
            'docker.local': {
                type: 'docker',
                name: 'local',
                maskConfiguration: () => ({ prune: false }),
                supportsSimulation: () => false,
                trigger: mockDockerTrigger,
            },
            'legacy.custom': {
                type: 'legacy',
                name: 'custom',
                maskConfiguration: () => ({}),
                trigger: mockLegacyTrigger,
            },
        },
    })),
}));

describe('API Trigger', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.get('/', trigger.getTriggers);
        app.get('/:type/:name', trigger.getTrigger);
        app.post('/:type/:name', trigger.runTrigger);
    });

    test('should get all triggers including supportsSimulation flag', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: 'docker.local',
                type: 'docker',
                name: 'local',
                configuration: { prune: false },
                supportsSimulation: false,
            },
            {
                id: 'legacy.custom',
                type: 'legacy',
                name: 'custom',
                configuration: {},
                supportsSimulation: false,
            },
            {
                id: 'mock.fail',
                type: 'mock',
                name: 'fail',
                configuration: { mockConfig: true },
                supportsSimulation: true,
            },
            {
                id: 'mock.test',
                type: 'mock',
                name: 'test',
                configuration: { mockConfig: true },
                supportsSimulation: true,
            },
        ]);
    });

    test('should get trigger by type and name with supportsSimulation flag', async () => {
        const res = await request(app).get('/mock/test');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: 'mock.test',
            type: 'mock',
            name: 'test',
            configuration: { mockConfig: true },
            supportsSimulation: true,
        });

        const resAction = await request(app).get('/docker/local');
        expect(resAction.status).toBe(200);
        expect(resAction.body).toEqual({
            id: 'docker.local',
            type: 'docker',
            name: 'local',
            configuration: { prune: false },
            supportsSimulation: false,
        });
    });

    test('should return 404 for unknown trigger', async () => {
        const res = await request(app).get('/mock/unknown');
        expect(res.status).toBe(404);
    });

    test('should return 403 when simulating a non-notification action trigger', async () => {
        const res = await request(app)
            .post('/docker/local')
            .send({ name: 'test-container' });
        expect(res.status).toBe(403);
        expect(res.body).toEqual({
            error: 'Forbidden',
            message: 'Trigger docker.local does not support test simulation',
        });
        expect(mockDockerTrigger).not.toHaveBeenCalled();
    });

    test('should return 403 when trigger does not implement supportsSimulation', async () => {
        const res = await request(app)
            .post('/legacy/custom')
            .send({ name: 'test-container' });
        expect(res.status).toBe(403);
        expect(res.body).toEqual({
            error: 'Forbidden',
            message: 'Trigger legacy.custom does not support test simulation',
        });
        expect(mockLegacyTrigger).not.toHaveBeenCalled();
    });

    test('should run trigger successfully and strip labels and unknown properties', async () => {
        const res = await request(app)
            .post('/mock/test')
            .send({
                id: '123456789',
                name: 'test-container',
                watcher: 'local',
                labels: {
                    'wud.hook.1.phase': 'pre',
                    'wud.hook.1.type': 'exec',
                    'wud.hook.1.command': 'id',
                    'wud.trigger.gotify.extras': '{"x":1}',
                    'wud.trigger.telegram.message_thread_id': '42',
                },
                unknownField: 'should-be-stripped',
                updateKind: {
                    kind: 'tag',
                    localValue: '1.0.0',
                    remoteValue: '2.0.0',
                    semverDiff: 'major',
                },
                result: {
                    link: 'https://example.com/releases/2.0.0',
                },
            });
        expect(res.status).toBe(200);
        expect(mockTestTrigger).toHaveBeenCalledTimes(1);
        const passedContainer = mockTestTrigger.mock.calls[0][0];
        expect(passedContainer).toMatchObject({
            id: '123456789',
            name: 'test-container',
            watcher: 'local',
            updateAvailable: true,
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
                semverDiff: 'major',
            },
            result: {
                tag: '2.0.0',
                link: 'https://example.com/releases/2.0.0',
            },
        });
        expect(passedContainer).not.toHaveProperty('labels');
        expect(passedContainer).not.toHaveProperty('unknownField');
        expect(passedContainer).not.toHaveProperty('overrideCooldown');
    });

    test('should normalize result.digest from updateKind.remoteValue for digest updates', async () => {
        const res = await request(app)
            .post('/mock/test')
            .send({
                name: 'digest-container',
                updateKind: {
                    kind: 'digest',
                    localValue: 'sha256:111111111111',
                    remoteValue: 'sha256:222222222222',
                },
            });
        expect(res.status).toBe(200);
        expect(mockTestTrigger).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'digest-container',
                result: {
                    digest: 'sha256:222222222222',
                },
            }),
        );
    });

    test('should set overrideCooldown=true on container when running trigger with overrideCooldown query parameter', async () => {
        const payload = { name: 'test-container' };
        const res = await request(app)
            .post('/mock/test?overrideCooldown=true')
            .send(payload);
        expect(res.status).toBe(200);
        expect(mockTestTrigger).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test-container',
                overrideCooldown: true,
            }),
        );
    });

    test('should set overrideCooldown=true when provided in request body', async () => {
        const res = await request(app)
            .post('/mock/test')
            .send({ name: 'test-container', overrideCooldown: true });
        expect(res.status).toBe(200);
        expect(mockTestTrigger).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test-container',
                overrideCooldown: true,
            }),
        );
    });

    test('should return 404 if trigger not found when running', async () => {
        const res = await request(app)
            .post('/mock/unknown')
            .send({ name: 'test-container' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'Not found',
            message:
                'Error when running trigger mock.unknown (trigger not found)',
        });
    });

    test('should return 400 if no container provided', async () => {
        const appNoBody = express();
        appNoBody.use((req, _res, next) => {
            req.body = undefined;
            next();
        });
        appNoBody.post('/:type/:name', trigger.runTrigger);

        const res = await request(appNoBody).post('/mock/test');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: 'Bad Request',
            message:
                'Error when running trigger mock.test (container is undefined)',
        });
    });

    test('should return 400 if body is an array instead of an object', async () => {
        const res = await request(app)
            .post('/mock/test')
            .send([{ name: 'test-container' }]);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Bad Request');
    });

    test('should return 400 if required name field is missing', async () => {
        const res = await request(app)
            .post('/mock/test')
            .send({ watcher: 'local' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Bad Request');
        expect(res.body.message).toContain('"name" is required');
    });

    test.each([
        ['MQTT slash injection in name', { name: 'app/injected' }],
        ['MQTT plus wildcard in name', { name: 'app+wild' }],
        ['MQTT hash wildcard in name', { name: 'app#wild' }],
        ['path traversal in name', { name: 'app..escape' }],
        [
            'MQTT slash injection in watcher',
            { name: 'app', watcher: 'local/injected' },
        ],
        [
            'MQTT hash wildcard in watcher',
            { name: 'app', watcher: 'local#wild' },
        ],
        [
            'javascript URI in result.link',
            {
                name: 'app',
                result: { link: 'javascript:alert(1)' },
            },
        ],
        [
            'file URI in link',
            {
                name: 'app',
                link: 'file:///etc/passwd',
            },
        ],
        [
            'invalid tag characters in remoteValue',
            {
                name: 'app',
                updateKind: {
                    kind: 'tag',
                    remoteValue: '1.0.0; rm -rf /',
                },
            },
        ],
    ])(
        'should return 400 for invalid simulation payload: %s',
        async (_label, body) => {
            const res = await request(app).post('/mock/test').send(body);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Bad Request');
            expect(mockTestTrigger).not.toHaveBeenCalled();
        },
    );

    test('should handle trigger run failure', async () => {
        const res = await request(app)
            .post('/mock/fail')
            .send({ name: 'test-container' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Trigger execution failed',
            message: 'Error when running trigger mock.fail (fail error)',
        });
    });

    test('should handle non-Error thrown value on trigger run failure', async () => {
        mockFailTrigger.mockRejectedValueOnce('raw failure string');
        const res = await request(app)
            .post('/mock/fail')
            .send({ name: 'test-container' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Trigger execution failed',
            message:
                'Error when running trigger mock.fail (raw failure string)',
        });
    });

    test('init should return an express router', () => {
        const router = trigger.init();
        expect(router).toBeDefined();
    });
});
