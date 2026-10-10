import { ValidationError } from 'joi';
import Gotify, { deepMerge } from './Gotify';
import Trigger, { RollbackReport } from '../Trigger';
import { Container } from '../../../model/container';

jest.mock('axios');

interface GotifyMessagePayload {
    title: string;
    message: string;
    priority?: number;
    extras?: Record<string, unknown>;
}

describe('Gotify Trigger', () => {
    let gotify: Gotify;

    const configurationValid: Record<string, unknown> = {
        url: 'http://xxx.com',
        token: 'xxx',
        priority: 2,
        mode: 'simple',
        threshold: 'all',
        once: true,
        auto: true,
        simpletitle:
            'New ${container.updateKind.kind} found for container ${container.name}',
        simplebody:
            'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
        batchtitle: '${containers.length} updates available',
    };

    beforeEach(async () => {
        jest.resetAllMocks();
        gotify = new Gotify();
        gotify.name = 'test';
    });

    describe('validateConfiguration', () => {
        test('should return validated configuration when valid', () => {
            const validatedConfiguration =
                gotify.validateConfiguration(configurationValid);
            expect(validatedConfiguration).toStrictEqual({
                ...configurationValid,
                rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
                events: ['available'],
                successtitle: 'Update SUCCESS for ${container.name}',
                successbody:
                    'Container ${container.name} has been successfully updated.',
                failuretitle: 'Update FAILED for ${container.name}',
                failurebody:
                    'Container ${container.name} update failed: ${error}',
                rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
            });
        });

        test('should apply default configuration', () => {
            const validatedConfiguration = gotify.validateConfiguration({
                url: configurationValid.url,
                token: configurationValid.token,
            });
            const expectedWithoutPriority: Record<string, unknown> = {
                ...configurationValid,
                rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
                events: ['available'],
                successtitle: 'Update SUCCESS for ${container.name}',
                successbody:
                    'Container ${container.name} has been successfully updated.',
                failuretitle: 'Update FAILED for ${container.name}',
                failurebody:
                    'Container ${container.name} update failed: ${error}',
                rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
            };
            delete expectedWithoutPriority.priority;
            expect(validatedConfiguration).toStrictEqual(
                expectedWithoutPriority,
            );
        });

        test('should throw error when invalid', () => {
            const configuration = {
                url: 'git://xxx.com',
            };
            expect(() => {
                gotify.validateConfiguration(configuration);
            }).toThrow(ValidationError);
        });

        test('should accept extras as an object', () => {
            const validatedConfiguration = gotify.validateConfiguration({
                ...configurationValid,
                extras: {
                    'client::display': {
                        contentType: 'text/markdown',
                    },
                },
            });
            expect(validatedConfiguration.extras).toEqual({
                'client::display': {
                    contentType: 'text/markdown',
                },
            });
        });

        test('should accept extras as a stringified JSON object and parse it', () => {
            const validatedConfiguration = gotify.validateConfiguration({
                ...configurationValid,
                extras: JSON.stringify({
                    'client::display': {
                        contentType: 'text/markdown',
                    },
                }),
            });
            expect(validatedConfiguration.extras).toEqual({
                'client::display': {
                    contentType: 'text/markdown',
                },
            });
        });

        test('should throw error when extras is an invalid JSON string', () => {
            expect(() => {
                gotify.validateConfiguration({
                    ...configurationValid,
                    extras: '{invalid-json',
                });
            }).toThrow(ValidationError);
        });

        test('should throw error when extras parses to a non-object', () => {
            expect(() => {
                gotify.validateConfiguration({
                    ...configurationValid,
                    extras: '123',
                });
            }).toThrow(ValidationError);

            expect(() => {
                gotify.validateConfiguration({
                    ...configurationValid,
                    extras: '"string"',
                });
            }).toThrow(ValidationError);

            expect(() => {
                gotify.validateConfiguration({
                    ...configurationValid,
                    extras: '[1, 2, 3]',
                });
            }).toThrow(ValidationError);
        });
    });

    describe('maskConfiguration', () => {
        test('should mask sensitive data', () => {
            gotify.configuration = {
                ...configurationValid,
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                },
            };
            expect(gotify.maskConfiguration()).toEqual({
                url: configurationValid.url,
                token: 'x*x',
                priority: 2,
                mode: 'simple',
                threshold: 'all',
                once: true,
                auto: true,
                simpletitle: configurationValid.simpletitle,
                simplebody: configurationValid.simplebody,
                batchtitle: configurationValid.batchtitle,
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                },
            });
        });
    });

    describe('deepMerge', () => {
        test('should recursively merge objects and override primitive values', () => {
            const target = {
                a: 1,
                nested: {
                    x: 'original',
                    y: 10,
                },
            };
            const source = {
                b: 2,
                nested: {
                    x: 'updated',
                    z: 20,
                },
            };
            const merged = deepMerge(target, source);
            expect(merged).toEqual({
                a: 1,
                b: 2,
                nested: {
                    x: 'updated',
                    y: 10,
                    z: 20,
                },
            });
        });
    });

    describe('parseExtras', () => {
        test('should return undefined for falsy or empty values', () => {
            expect(gotify.parseExtras(undefined)).toBeUndefined();
            expect(gotify.parseExtras(null)).toBeUndefined();
            expect(gotify.parseExtras('')).toBeUndefined();
            expect(gotify.parseExtras('   ')).toBeUndefined();
        });

        test('should return object as-is when already a plain object', () => {
            const extrasObj = {
                'client::display': { contentType: 'text/markdown' },
            };
            expect(gotify.parseExtras(extrasObj)).toEqual(extrasObj);
        });

        test('should parse valid JSON string to object', () => {
            const jsonStr =
                '{"client::display": {"contentType": "text/markdown"}}';
            expect(gotify.parseExtras(jsonStr)).toEqual({
                'client::display': { contentType: 'text/markdown' },
            });
        });

        test('should log warning and return undefined for invalid JSON string', () => {
            const warnSpy = jest.spyOn(gotify.log, 'warn');
            const result = gotify.parseExtras('not-a-json', 'test-source');
            expect(result).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Failed to parse Gotify extras JSON (test-source)',
                ),
            );
        });

        test('should log warning and return undefined when JSON string parses to non-object', () => {
            const warnSpy = jest.spyOn(gotify.log, 'warn');
            const result = gotify.parseExtras('[1, 2, 3]', 'test-source');
            expect(result).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Gotify extras (test-source) must be a valid JSON object',
                ),
            );
        });

        test('should log warning and return undefined for non-object, non-string input', () => {
            const warnSpy = jest.spyOn(gotify.log, 'warn');
            const result = gotify.parseExtras(12345, 'test-source');
            expect(result).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Gotify extras (test-source) must be an object',
                ),
            );
        });
    });

    describe('getExtras', () => {
        test('should return undefined when no extras are configured', () => {
            gotify.configuration = { ...configurationValid };
            const container = { name: 'c1' } as Container;
            expect(gotify.getExtras(container)).toBeUndefined();
        });

        test('should return global extras when only trigger config has extras', () => {
            gotify.configuration = {
                ...configurationValid,
                extras: { 'client::display': { contentType: 'text/markdown' } },
            };
            const container = { name: 'c1' } as Container;
            expect(gotify.getExtras(container)).toEqual({
                'client::display': { contentType: 'text/markdown' },
            });
        });

        test('should merge generic and specific container labels with global extras', () => {
            gotify.name = 'mygotify';
            gotify.configuration = {
                ...configurationValid,
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                    common: 'global',
                },
            };
            const container = {
                name: 'c1',
                labels: {
                    'wud.trigger.gotify.extras': JSON.stringify({
                        'client::notification': {
                            click: { url: 'https://generic.example.com' },
                        },
                        common: 'generic-label',
                    }),
                    'wud.trigger.gotify.mygotify.extras': JSON.stringify({
                        'client::notification': {
                            click: { url: 'https://specific.example.com' },
                        },
                        common: 'specific-label',
                    }),
                },
            } as unknown as Container;

            expect(gotify.getExtras(container)).toEqual({
                'client::display': { contentType: 'text/markdown' },
                'client::notification': {
                    click: { url: 'https://specific.example.com' },
                },
                common: 'specific-label',
            });
        });

        test('should handle container without labels', () => {
            gotify.configuration = {
                ...configurationValid,
                extras: { 'client::display': { contentType: 'text/markdown' } },
            };
            const container = { name: 'c1' } as Container;
            expect(gotify.getExtras(container)).toEqual({
                'client::display': { contentType: 'text/markdown' },
            });
        });
    });

    describe('getBatchExtras', () => {
        test('should return global extras when no container labels are present', () => {
            gotify.configuration = {
                ...configurationValid,
                extras: { 'client::display': { contentType: 'text/markdown' } },
            };
            expect(gotify.getBatchExtras()).toEqual({
                'client::display': { contentType: 'text/markdown' },
            });
        });

        test('should merge extras from container labels in the batch', () => {
            gotify.name = 'prod';
            gotify.configuration = {
                ...configurationValid,
                extras: { 'client::display': { contentType: 'text/markdown' } },
            };
            const containers = [
                {
                    name: 'c1',
                    labels: {
                        'wud.trigger.gotify.extras':
                            '{"client::notification": {"click": {"url": "https://example.com"}}}',
                    },
                },
                {
                    name: 'c2',
                    labels: {
                        'wud.trigger.gotify.prod.extras':
                            '{"batch::custom": {"key": "val"}}',
                    },
                },
            ] as unknown as Container[];

            expect(gotify.getBatchExtras(containers)).toEqual({
                'client::display': { contentType: 'text/markdown' },
                'client::notification': {
                    click: { url: 'https://example.com' },
                },
                'batch::custom': { key: 'val' },
            });
        });
    });

    describe('trigger', () => {
        test('should send POST request to Gotify API without extras when not configured', async () => {
            gotify.configuration = configurationValid;
            const createMessageMock = jest.fn().mockResolvedValue({});
            gotify.client = {
                message: {
                    createMessage: createMessageMock,
                },
            } as any;

            const container = {
                name: 'container1',
                updateKind: {
                    kind: 'tag',
                    localValue: '1.0.0',
                    remoteValue: '2.0.0',
                },
            } as unknown as Container;

            await gotify.trigger(container);
            expect(createMessageMock).toHaveBeenCalledWith({
                title: 'New tag found for container container1',
                message:
                    'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
                priority: 2,
            });
            const callArg = createMessageMock.mock
                .calls[0][0] as GotifyMessagePayload;
            expect(callArg.extras).toBeUndefined();
        });

        test('should send POST request to Gotify API with extras when configured', async () => {
            gotify.configuration = {
                ...configurationValid,
                extras: {
                    'client::display': {
                        contentType: 'text/markdown',
                    },
                },
            };
            const createMessageMock = jest.fn().mockResolvedValue({});
            gotify.client = {
                message: {
                    createMessage: createMessageMock,
                },
            } as any;

            const container = {
                name: 'container1',
                updateKind: {
                    kind: 'tag',
                    localValue: '1.0.0',
                    remoteValue: '2.0.0',
                },
                labels: {
                    'wud.trigger.gotify.extras': JSON.stringify({
                        'client::notification': {
                            click: { url: 'https://example.com' },
                        },
                    }),
                },
            } as unknown as Container;

            await gotify.trigger(container);
            expect(createMessageMock).toHaveBeenCalledWith({
                title: 'New tag found for container container1',
                message:
                    'Container container1 running with tag 1.0.0 can be updated to tag 2.0.0',
                priority: 2,
                extras: {
                    'client::display': {
                        contentType: 'text/markdown',
                    },
                    'client::notification': {
                        click: { url: 'https://example.com' },
                    },
                },
            });
        });
    });

    describe('register', () => {
        test('should initialize Gotify client on register', async () => {
            const gotifyInstance = new Gotify();
            await gotifyInstance.register('trigger', 'gotify', 'test', {
                url: 'http://gotify.example.com',
                token: 'test-token',
            });

            expect(gotifyInstance.client).toBeDefined();
        });
    });

    describe('triggerBatch', () => {
        test('should send batch notification without extras', async () => {
            gotify.configuration = configurationValid;
            const createMessageMock = jest.fn().mockResolvedValue({});
            gotify.client = {
                message: {
                    createMessage: createMessageMock,
                },
            } as any;

            const containers = [
                {
                    name: 'test1',
                    updateKind: {
                        kind: 'tag',
                        localValue: '1.0',
                        remoteValue: '2.0',
                    },
                },
                {
                    name: 'test2',
                    updateKind: {
                        kind: 'tag',
                        localValue: '1.1',
                        remoteValue: '2.1',
                    },
                },
            ] as unknown as Container[];

            await gotify.triggerBatch(containers);

            expect(createMessageMock).toHaveBeenCalledWith({
                title: '2 updates available',
                message: expect.any(String),
                priority: 2,
            });
            const callArg = createMessageMock.mock
                .calls[0][0] as GotifyMessagePayload;
            expect(callArg.extras).toBeUndefined();
        });

        test('should send batch notification with extras', async () => {
            gotify.configuration = {
                ...configurationValid,
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                },
            };
            const createMessageMock = jest.fn().mockResolvedValue({});
            gotify.client = {
                message: {
                    createMessage: createMessageMock,
                },
            } as any;

            const containers = [
                {
                    name: 'test1',
                    updateKind: {
                        kind: 'tag',
                        localValue: '1.0',
                        remoteValue: '2.0',
                    },
                },
            ] as unknown as Container[];

            await gotify.triggerBatch(containers);

            expect(createMessageMock).toHaveBeenCalledWith({
                title: '1 updates available',
                message: expect.any(String),
                priority: 2,
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                },
            });
        });
    });

    describe('triggerRollback', () => {
        test('should support rollback notifications', () => {
            expect(gotify.supportsRollbackNotifications()).toBe(true);
        });

        test('should send rollback notification without extras', async () => {
            gotify.configuration = {
                ...configurationValid,
                rollbacktitle: 'Rollback ${name}',
                rollbackbody: 'Rollback body for ${name}',
            };
            const createMessageMock = jest.fn().mockResolvedValue({});
            gotify.client = {
                message: {
                    createMessage: createMessageMock,
                },
            } as any;

            const rollbackReport: RollbackReport = {
                scope: 'container',
                status: 'succeeded',
                container: {
                    name: 'app-web',
                } as unknown as Container,
                oldImageRef: 'app:1.0.0',
                newImageRef: 'app:2.0.0',
            };

            await gotify.triggerRollback(rollbackReport);

            expect(createMessageMock).toHaveBeenCalledWith({
                title: 'Rollback app-web',
                message: 'Rollback body for app-web',
                priority: 2,
            });
            const callArg = createMessageMock.mock
                .calls[0][0] as GotifyMessagePayload;
            expect(callArg.extras).toBeUndefined();
        });

        test('should send rollback notification with extras when configured on container', async () => {
            gotify.configuration = {
                ...configurationValid,
                rollbacktitle: 'Rollback ${name}',
                rollbackbody: 'Rollback body for ${name}',
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                },
            };
            const createMessageMock = jest.fn().mockResolvedValue({});
            gotify.client = {
                message: {
                    createMessage: createMessageMock,
                },
            } as any;

            const rollbackReport: RollbackReport = {
                scope: 'container',
                status: 'succeeded',
                container: {
                    name: 'app-web',
                    labels: {
                        'wud.trigger.gotify.extras':
                            '{"client::notification": {"click": {"url": "https://rollback.example.com"}}}',
                    },
                } as unknown as Container,
                oldImageRef: 'app:1.0.0',
                newImageRef: 'app:2.0.0',
            };

            await gotify.triggerRollback(rollbackReport);

            expect(createMessageMock).toHaveBeenCalledWith({
                title: 'Rollback app-web',
                message: 'Rollback body for app-web',
                priority: 2,
                extras: {
                    'client::display': { contentType: 'text/markdown' },
                    'client::notification': {
                        click: { url: 'https://rollback.example.com' },
                    },
                },
            });
        });
    });
});
