import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import Dockerode from 'dockerode';
import pino, { Logger } from 'pino';
import {
    Hook,
    HookContext,
    HookManager,
    getHooksForPhase,
    hookSchema,
    parseContainerHooks,
} from './HookManager';
import { Container } from '../../model/container';
import { getState } from '../../registry';

jest.mock('../../registry');

describe('HookManager', () => {
    let mockLog: Logger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLog = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        } as unknown as Logger;
    });

    describe('hookSchema', () => {
        it('should validate a valid exec hook', () => {
            const { error, value } = hookSchema.validate({
                type: 'exec',
                phase: 'pre',
                command: 'echo "test"',
            });
            expect(error).toBeUndefined();
            expect(value.target).toBe('self');
            expect(value.timeout).toBe(60000);
        });

        it('should validate a valid trigger hook', () => {
            const { error, value } = hookSchema.validate({
                type: 'trigger',
                phase: 'post',
                trigger: 'slack',
                timeout: 30000,
            });
            expect(error).toBeUndefined();
            expect(value.trigger).toBe('slack');
            expect(value.timeout).toBe(30000);
        });

        it('should fail when exec hook is missing command', () => {
            const { error } = hookSchema.validate({
                type: 'exec',
                phase: 'pre',
            });
            expect(error).toBeDefined();
        });

        it('should fail when trigger hook is missing trigger', () => {
            const { error } = hookSchema.validate({
                type: 'trigger',
                phase: 'post',
            });
            expect(error).toBeDefined();
        });

        it('should fail when phase is invalid', () => {
            const { error } = hookSchema.validate({
                type: 'exec',
                phase: 'invalid',
                command: 'ls',
            });
            expect(error).toBeDefined();
        });

        it('should fail when type is invalid', () => {
            const { error } = hookSchema.validate({
                type: 'unknown',
                phase: 'pre',
                command: 'ls',
            });
            expect(error).toBeDefined();
        });
    });

    describe('parseContainerHooks', () => {
        it('should return an empty array if labels are undefined', () => {
            expect(parseContainerHooks(undefined)).toEqual([]);
        });

        it('should return an empty array if no hook labels are present', () => {
            expect(
                parseContainerHooks({ 'wud.tag.include': 'latest' }),
            ).toEqual([]);
        });

        it('should parse valid exec and trigger hooks sorted by index', () => {
            const labels = {
                'wud.hook.10.phase': 'post',
                'wud.hook.10.type': 'trigger',
                'wud.hook.10.trigger': 'slack',
                'wud.hook.2.phase': 'pre',
                'wud.hook.2.type': 'exec',
                'wud.hook.2.command': 'backup.sh',
                'wud.hook.2.target': 'db-container',
                'wud.hook.2.timeout': '120000',
            };

            const hooks = parseContainerHooks(labels);
            expect(hooks).toHaveLength(2);
            expect(hooks[0]).toEqual({
                phase: 'pre',
                type: 'exec',
                command: 'backup.sh',
                target: 'db-container',
                trigger: undefined,
                timeout: 120000,
            });
            expect(hooks[1]).toEqual({
                phase: 'post',
                type: 'trigger',
                command: undefined,
                target: 'self',
                trigger: 'slack',
                timeout: 60000,
            });
        });

        it('should skip exec hooks without command', () => {
            const labels = {
                'wud.hook.1.phase': 'pre',
                'wud.hook.1.type': 'exec',
            };
            expect(parseContainerHooks(labels)).toEqual([]);
        });

        it('should skip trigger hooks without trigger name', () => {
            const labels = {
                'wud.hook.1.phase': 'post',
                'wud.hook.1.type': 'trigger',
            };
            expect(parseContainerHooks(labels)).toEqual([]);
        });

        it('should skip hooks with invalid phase or type', () => {
            const labels = {
                'wud.hook.1.phase': 'middle',
                'wud.hook.1.type': 'exec',
                'wud.hook.1.command': 'echo 1',
                'wud.hook.2.phase': 'pre',
                'wud.hook.2.type': 'custom',
                'wud.hook.2.command': 'echo 2',
            };
            expect(parseContainerHooks(labels)).toEqual([]);
        });

        it('should ignore invalid timeout and default to 60000', () => {
            const labels = {
                'wud.hook.1.phase': 'pre',
                'wud.hook.1.type': 'exec',
                'wud.hook.1.command': 'echo test',
                'wud.hook.1.timeout': 'not-a-number',
            };
            const hooks = parseContainerHooks(labels);
            expect(hooks[0].timeout).toBe(60000);
        });
    });

    describe('getHooksForPhase', () => {
        const dummyContainer: Container = {
            id: 'c1',
            name: 'my-app',
            displayName: 'my-app',
            displayIcon: 'docker',
            status: 'running',
            watcher: 'local',
            image: {
                id: 'img1',
                registry: { name: 'docker.io', url: 'https://index.docker.io' },
                name: 'my-app',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false },
                architecture: 'amd64',
                os: 'linux',
            },
            updateAvailable: true,
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '1.1.0',
            },
            labels: {
                'wud.hook.1.phase': 'pre',
                'wud.hook.1.type': 'exec',
                'wud.hook.1.command': 'echo container-pre',
                'wud.hook.2.phase': 'post',
                'wud.hook.2.type': 'exec',
                'wud.hook.2.command': 'echo container-post',
            },
        };

        it('should merge global hooks and container hooks and filter by phase', () => {
            const globalHooks: Hook[] = [
                {
                    phase: 'pre',
                    type: 'exec',
                    command: 'echo global-pre',
                },
                {
                    phase: 'post',
                    type: 'trigger',
                    trigger: 'slack',
                },
            ];

            const preHooks = getHooksForPhase(
                'pre',
                dummyContainer,
                globalHooks,
            );
            expect(preHooks).toHaveLength(2);
            expect(preHooks[0].command).toBe('echo global-pre');
            expect(preHooks[1].command).toBe('echo container-pre');

            const postHooks = getHooksForPhase(
                'post',
                dummyContainer,
                globalHooks,
            );
            expect(postHooks).toHaveLength(2);
            expect(postHooks[0].trigger).toBe('slack');
            expect(postHooks[1].command).toBe('echo container-post');
        });
    });

    describe('executeExecHook (Type A & Type B)', () => {
        let mockDockerApi: jest.Mocked<Dockerode>;
        let mockTargetContainer: {
            exec: jest.Mock;
        };
        let mockExec: {
            start: jest.Mock;
            inspect: jest.Mock;
        };

        const testContainer: Container = {
            id: 'c123',
            name: 'frontend',
            displayName: 'frontend',
            displayIcon: 'docker',
            status: 'running',
            watcher: 'local_daemon',
            image: {
                id: 'img123',
                registry: { name: 'docker.io', url: 'https://index.docker.io' },
                name: 'frontend',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false },
                architecture: 'amd64',
                os: 'linux',
            },
            updateAvailable: true,
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '1.1.0',
            },
        };

        beforeEach(() => {
            mockExec = {
                start: jest.fn(),
                inspect: jest.fn().mockResolvedValue({
                    Running: false,
                    ExitCode: 0,
                }),
            };

            mockTargetContainer = {
                exec: jest.fn().mockResolvedValue(mockExec),
            };

            mockDockerApi = {
                getContainer: jest.fn().mockReturnValue(mockTargetContainer),
                modem: {
                    demuxStream: jest.fn(
                        (
                            stream: PassThrough,
                            stdout: PassThrough,
                            stderr: PassThrough,
                        ) => {
                            stream.on('data', (chunk) => {
                                stdout.write(chunk);
                            });
                        },
                    ),
                },
            } as unknown as jest.Mocked<Dockerode>;
        });

        it('should execute Type A hook targeting self container and pass environment variables', async () => {
            const stream = new PassThrough();
            mockExec.start.mockResolvedValue(stream);

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'npm run test',
                target: 'self',
            };

            const runPromise = HookManager.runHooks(
                'pre',
                testContainer,
                [hook],
                context,
            );

            // Emit output then end
            stream.write('all tests passed');
            stream.end();

            await runPromise;

            expect(mockDockerApi.getContainer).toHaveBeenCalledWith('c123');
            expect(mockTargetContainer.exec).toHaveBeenCalledWith(
                expect.objectContaining({
                    Cmd: ['sh', '-c', 'npm run test'],
                    Env: [
                        'WUD_CONTAINER_NAME=frontend',
                        'WUD_CONTAINER_ID=c123',
                        'WUD_IMAGE_OLD_TAG=1.0.0',
                        'WUD_IMAGE_NEW_TAG=1.1.0',
                        'WUD_WATCHER_NAME=local_daemon',
                        'WUD_TRIGGER_NAME=docker_local',
                        'WUD_HOOK_PHASE=pre',
                    ],
                }),
            );
            expect(mockLog.info).toHaveBeenCalledWith(
                expect.stringContaining('all tests passed'),
            );
        });

        it('should execute Type B hook targeting another container by name', async () => {
            const stream = new PassThrough();
            mockExec.start.mockResolvedValue(stream);

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'pg_dump -U root db > /tmp/backup.sql',
                target: 'postgres-db',
            };

            const runPromise = HookManager.runHooks(
                'pre',
                testContainer,
                [hook],
                context,
            );
            stream.end();

            await runPromise;

            expect(mockDockerApi.getContainer).toHaveBeenCalledWith(
                'postgres-db',
            );
        });

        it('should handle stream data without modem demuxStream', async () => {
            delete (mockDockerApi as unknown as { modem?: unknown }).modem;

            const stream = new PassThrough();
            mockExec.start.mockResolvedValue(stream);

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'post',
                type: 'exec',
                command: 'echo "done"',
            };

            const runPromise = HookManager.runHooks(
                'post',
                testContainer,
                [hook],
                context,
            );
            stream.write('done\n');
            stream.end();

            await runPromise;

            expect(mockLog.info).toHaveBeenCalledWith(
                expect.stringContaining('done'),
            );
        });

        it('should throw an error if command exits with non-zero exit code', async () => {
            const stream = new PassThrough();
            mockExec.start.mockResolvedValue(stream);
            mockExec.inspect.mockResolvedValue({
                Running: false,
                ExitCode: 1,
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'exit 1',
            };

            const runPromise = HookManager.runHooks(
                'pre',
                testContainer,
                [hook],
                context,
            );
            stream.end();

            await expect(runPromise).rejects.toThrow(
                'Hook command failed with exit code 1: exit 1',
            );
        });

        it('should log stderr if command failed with stderr output', async () => {
            const stream = new PassThrough();
            mockExec.start.mockResolvedValue(stream);
            mockExec.inspect.mockResolvedValue({
                Running: false,
                ExitCode: 2,
            });

            // Mock modem demux to write to stderr
            mockDockerApi.modem.demuxStream = jest.fn(
                (stream, stdout, stderr) => {
                    stream.on('data', (chunk) => stderr.write(chunk));
                },
            );

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'bad_command',
            };

            const runPromise = HookManager.runHooks(
                'pre',
                testContainer,
                [hook],
                context,
            );
            stream.write('fatal error\n');
            stream.end();

            await expect(runPromise).rejects.toThrow(
                'Hook command failed with exit code 2: bad_command\nStderr: fatal error',
            );
            expect(mockLog.warn).toHaveBeenCalledWith(
                expect.stringContaining('fatal error'),
            );
        });

        it('should throw when stream emits an error', async () => {
            const stream = new PassThrough();
            mockExec.start.mockImplementation(async () => {
                setImmediate(() => {
                    stream.emit(
                        'error',
                        new Error('Docker socket disconnected'),
                    );
                });
                return stream;
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'echo 1',
            };

            await expect(
                HookManager.runHooks('pre', testContainer, [hook], context),
            ).rejects.toThrow('Docker socket disconnected');
        });

        it('should timeout when exec command exceeds timeout limit', async () => {
            const stream = new PassThrough();
            stream.destroy = jest.fn();
            mockExec.start.mockResolvedValue(stream);

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'sleep 100',
                timeout: 50,
            };

            await expect(
                HookManager.runHooks('pre', testContainer, [hook], context),
            ).rejects.toThrow('Hook command timed out after 50ms: sleep 100');
            expect(stream.destroy).toHaveBeenCalled();
        });

        it('should throw if dockerApi is missing when running exec hook', async () => {
            const context: HookContext = {
                triggerName: 'docker_local',
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'echo 1',
            };

            await expect(
                HookManager.runPreHooks(testContainer, [hook], context),
            ).rejects.toThrow(
                'Docker API is required to execute pre-update exec hook',
            );
        });

        it('should poll inspect when inspect returns Running=true initially', async () => {
            const stream = new PassThrough();
            mockExec.start.mockImplementation(async () => {
                setImmediate(() => stream.end());
                return stream;
            });

            let inspectCount = 0;
            mockExec.inspect.mockImplementation(async () => {
                inspectCount++;
                if (inspectCount === 1) {
                    return { Running: true, ExitCode: 0 };
                }
                return { Running: false, ExitCode: 0 };
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                dockerApi: mockDockerApi,
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'exec',
                command: 'echo 1',
            };

            await HookManager.runHooks('pre', testContainer, [hook], context);
            expect(inspectCount).toBe(2);
        });
    });

    describe('executeTriggerHook (Type C)', () => {
        const testContainer: Container = {
            id: 'c456',
            name: 'api',
            displayName: 'api',
            displayIcon: 'docker',
            status: 'running',
            watcher: 'local',
            image: {
                id: 'img456',
                registry: { name: 'docker.io', url: 'https://index.docker.io' },
                name: 'api',
                tag: { value: '1.0.0', semver: true },
                digest: { watch: false },
                architecture: 'amd64',
                os: 'linux',
            },
            updateAvailable: true,
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '1.0.1',
            },
        };

        it('should find trigger by key and execute with enriched hook context', async () => {
            const mockTrigger = {
                name: 'slack',
                type: 'slack',
                trigger: jest.fn().mockResolvedValue(undefined),
            };

            (getState as jest.Mock).mockReturnValue({
                trigger: {
                    slack: mockTrigger,
                },
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'post',
                type: 'trigger',
                trigger: 'slack',
            };

            await HookManager.runPostHooks(testContainer, [hook], context);

            expect(mockTrigger.trigger).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'api',
                    result: expect.objectContaining({
                        hook: {
                            phase: 'post',
                            parentTrigger: 'docker_local',
                        },
                    }),
                }),
            );
        });

        it('should find trigger by suffix/type when key does not match directly', async () => {
            const mockTrigger = {
                name: 'myslack',
                type: 'slack',
                trigger: jest.fn().mockResolvedValue(undefined),
            };

            (getState as jest.Mock).mockReturnValue({
                trigger: {
                    'slack.myslack': mockTrigger,
                },
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'post',
                type: 'trigger',
                trigger: 'myslack',
            };

            await HookManager.runPostHooks(testContainer, [hook], context);
            expect(mockTrigger.trigger).toHaveBeenCalled();
        });

        it('should throw an error when trigger is not found', async () => {
            (getState as jest.Mock).mockReturnValue({
                trigger: {},
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'post',
                type: 'trigger',
                trigger: 'missing_trigger',
            };

            await expect(
                HookManager.runPostHooks(testContainer, [hook], context),
            ).rejects.toThrow("Trigger 'missing_trigger' not found");
        });

        it('should timeout when chained trigger hangs', async () => {
            jest.useFakeTimers();

            const mockTrigger = {
                name: 'slow_trigger',
                type: 'webhook',
                trigger: jest.fn().mockReturnValue(new Promise(() => {})),
            };

            (getState as jest.Mock).mockReturnValue({
                trigger: {
                    slow_trigger: mockTrigger,
                },
            });

            const context: HookContext = {
                triggerName: 'docker_local',
                log: mockLog,
            };

            const hook: Hook = {
                phase: 'pre',
                type: 'trigger',
                trigger: 'slow_trigger',
                timeout: 300,
            };

            const runPromise = HookManager.runPreHooks(
                testContainer,
                [hook],
                context,
            );

            jest.advanceTimersByTime(301);

            await expect(runPromise).rejects.toThrow(
                "Trigger hook 'slow_trigger' timed out after 300ms",
            );

            jest.useRealTimers();
        });
    });

    describe('Quality gate and empty hooks', () => {
        it('should do nothing if no hooks match the phase', async () => {
            const context: HookContext = {
                triggerName: 'docker_local',
                log: mockLog,
            };

            const dummyContainer: Container = {
                id: 'c1',
                name: 'app',
                displayName: 'app',
                displayIcon: 'docker',
                status: 'running',
                watcher: 'local',
                image: {
                    id: 'img1',
                    registry: { name: 'docker.io', url: 'https://docker.io' },
                    name: 'app',
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                updateAvailable: true,
                updateKind: { kind: 'tag' },
            };

            await expect(
                HookManager.runPreHooks(dummyContainer, undefined, context),
            ).resolves.toBeUndefined();
            expect(mockLog.info).not.toHaveBeenCalled();
        });
    });
});
