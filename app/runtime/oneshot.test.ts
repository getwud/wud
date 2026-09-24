// @ts-nocheck
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    parseArgs,
    runOneShot,
    exitOneshot,
    serializeContainers,
    filterContainers,
    sortContainers,
    probeDockerConnections,
    stripProgramTokens,
    isLaunchToken,
    EXIT_OK,
    EXIT_ERROR,
    ONESHOT_USAGE,
} from './oneshot';
import { validate as validateContainer } from '../model/container';

jest.mock('./bootstrap', () => ({
    bootstrap: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../log', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(() => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        })),
    },
}));

const mockRegistryState = {
    watcher: {},
    trigger: {},
    registry: {},
    authentication: {},
};

jest.mock('../registry', () => ({
    getState: jest.fn(() => mockRegistryState),
}));

/**
 * Build a real validated Container (same model as the engine/API).
 * Mirrors the field set produced by the Docker watcher (optional keys
 * explicitly set, possibly undefined).
 */
function buildContainer(overrides = {}) {
    return validateContainer({
        id: 'container-1',
        name: 'nginx',
        displayName: undefined,
        displayIcon: undefined,
        status: 'running',
        watcher: 'local',
        stack: undefined,
        delay: undefined,
        includeTags: undefined,
        excludeTags: undefined,
        transformTags: undefined,
        linkTemplate: undefined,
        triggerInclude: undefined,
        triggerExclude: undefined,
        snoozedVersion: undefined,
        snoozedUntil: undefined,
        image: {
            id: 'image-1',
            registry: { name: 'hub.public', url: 'registry-1.docker.io' },
            name: 'library/nginx',
            tag: { value: '1.0.0', semver: true },
            digest: { watch: false, value: undefined, repo: undefined },
            architecture: 'x86_64',
            os: 'linux',
        },
        result: { tag: '1.2.0' },
        updateKind: { kind: 'tag' },
        labels: {},
        ...overrides,
    });
}

function buildWatcher(reports, dockerApi = undefined) {
    return {
        watch: jest.fn().mockResolvedValue(reports),
        dockerApi,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockRegistryState.watcher = {};
});

describe('stripProgramTokens', () => {
    test('should strip node dist/index to []', () => {
        expect(stripProgramTokens(['node', 'dist/index'])).toEqual([]);
    });

    test('should strip wud to []', () => {
        expect(stripProgramTokens(['wud'])).toEqual([]);
    });

    test('should preserve empty array []', () => {
        expect(stripProgramTokens([])).toEqual([]);
    });

    test('should strip node dist/index before watch', () => {
        expect(stripProgramTokens(['node', 'dist/index', 'watch'])).toEqual([
            'watch',
        ]);
    });

    test('should strip wud before version', () => {
        expect(stripProgramTokens(['wud', 'version'])).toEqual(['version']);
    });

    test('should strip wud before unknown command', () => {
        expect(stripProgramTokens(['wud', 'unknown'])).toEqual(['unknown']);
    });

    test('should strip node dist/index before unknown command', () => {
        expect(stripProgramTokens(['node', 'dist/index', 'bar'])).toEqual([
            'bar',
        ]);
    });

    test('should identify launch tokens correctly', () => {
        expect(isLaunchToken('node')).toBe(true);
        expect(isLaunchToken('node.exe')).toBe(true);
        expect(isLaunchToken('/usr/local/bin/node')).toBe(true);
        expect(isLaunchToken('wud')).toBe(true);
        expect(isLaunchToken('/usr/bin/wud')).toBe(true);
        expect(isLaunchToken('dist/index')).toBe(true);
        expect(isLaunchToken('dist/index.js')).toBe(true);
        expect(isLaunchToken('/app/dist/index')).toBe(true);
        expect(isLaunchToken('/app/dist/index.js')).toBe(true);
        expect(isLaunchToken('')).toBe(false);
        expect(isLaunchToken('watch')).toBe(false);
        expect(isLaunchToken('version')).toBe(false);
        expect(isLaunchToken('--help')).toBe(false);
    });
});

describe('parseArgs', () => {
    test('no arguments should default to watch', () => {
        const parsed = parseArgs([]);
        expect(parsed.command).toBe('watch');
        expect(parsed.updateAvailable).toBe(false);
        expect(parsed.format).toBe('json');
        expect(parsed.failOnUpdate).toBe(false);
    });

    test('should parse the watch command with all options', () => {
        const parsed = parseArgs([
            'watch',
            '--update-available',
            '--format=ndjson',
            '--fail-on-update',
        ]);
        expect(parsed.command).toBe('watch');
        expect(parsed.updateAvailable).toBe(true);
        expect(parsed.format).toBe('ndjson');
        expect(parsed.failOnUpdate).toBe(true);
    });

    test('should parse version', () => {
        expect(parseArgs(['version']).command).toBe('version');
    });

    test('should parse --help', () => {
        expect(parseArgs(['--help']).command).toBe('help');
        expect(parseArgs(['watch', '--help']).command).toBe('help');
    });

    test('should accept --format=json explicitly', () => {
        expect(parseArgs(['watch', '--format=json']).format).toBe('json');
    });

    test('should throw on unknown command', () => {
        expect(() => parseArgs(['snooze'])).toThrow(/Unknown command "snooze"/);
    });

    test('should throw on unknown watch option', () => {
        expect(() => parseArgs(['watch', '--nope'])).toThrow(
            /Unknown option "--nope"/,
        );
    });

    test('should throw on invalid --format value', () => {
        expect(() => parseArgs(['watch', '--format=xml'])).toThrow(
            /Invalid --format value "xml"/,
        );
    });

    test('should throw on extra argument after version', () => {
        expect(() => parseArgs(['version', '--update-available'])).toThrow(
            /Unexpected argument/,
        );
    });
});

describe('serializeContainers', () => {
    test('should serialize like the API (replacer, getters, no functions)', () => {
        const container = buildContainer();
        const json = serializeContainers([container], 'json');
        const parsed = JSON.parse(json);
        // Computed getter returning undefined -> null via the replacer
        expect(parsed[0].coolingDownUntil).toBeNull();
        // Computed getters
        expect(parsed[0].isSnoozed).toBe(false);
        expect(parsed[0].isCoolingDown).toBe(false);
        expect(parsed[0].updateAvailable).toBe(true);
        expect(parsed[0].updateKind.semverDiff).toBe('minor');
        // Functions (resultChanged) must not be serialized
        expect(json).not.toContain('resultChanged');
        // Absent stateless fields serialize as null (same as GET /api/containers)
        expect(parsed[0].delay).toBeNull();
        expect(parsed[0].snoozedVersion).toBeNull();
        expect(parsed[0].snoozedUntil).toBeNull();
    });

    test('should serialize an empty array as []', () => {
        expect(serializeContainers([], 'json')).toBe('[]');
    });

    test('ndjson should output one JSON object per line', () => {
        const containers = [buildContainer(), buildContainer({ id: 'b' })];
        const ndjson = serializeContainers(containers, 'ndjson');
        const lines = ndjson.split('\n');
        expect(lines).toHaveLength(2);
        expect(JSON.parse(lines[0]).id).toBe('container-1');
        expect(JSON.parse(lines[1]).id).toBe('b');
        expect(ndjson.startsWith('[')).toBe(false);
    });
});

describe('filterContainers', () => {
    test('should mirror the store generic in-memory filter', () => {
        const updated = buildContainer();
        const notUpdated = buildContainer({
            id: 'other',
            result: { tag: '1.0.0' },
        });
        const filtered = filterContainers([notUpdated, updated], {
            updateAvailable: true,
        });
        expect(filtered.map((c) => c.id)).toEqual(['container-1']);
    });
});

describe('sortContainers', () => {
    test('should sort by watcher, then name, then image tag', () => {
        const a = buildContainer({
            id: 'a',
            watcher: 'local',
            name: 'bbb',
        });
        const b = buildContainer({
            id: 'b',
            watcher: 'local',
            name: 'aaa',
        });
        const c = buildContainer({
            id: 'c',
            watcher: 'aaa',
            name: 'zzz',
        });
        const sorted = sortContainers([a, b, c]);
        expect(sorted.map((x) => x.id)).toEqual(['c', 'b', 'a']);
    });
});

describe('probeDockerConnections', () => {
    test('should ping watchers exposing a dockerApi', async () => {
        const ping = jest.fn().mockResolvedValue(true);
        await probeDockerConnections([{ dockerApi: { ping } }, {}]);
        expect(ping).toHaveBeenCalledTimes(1);
    });

    test('should ignore watchers without ping function on dockerApi', async () => {
        await expect(
            probeDockerConnections([
                { dockerApi: {} },
                { dockerApi: null },
                {},
            ]),
        ).resolves.toBeUndefined();
    });

    test('should propagate a ping failure', async () => {
        const ping = jest.fn().mockRejectedValue(new Error('socket not found'));
        await expect(
            probeDockerConnections([{ dockerApi: { ping } }]),
        ).rejects.toThrow('socket not found');
    });
});

describe('runOneShot', () => {
    test('version should print the version and exit 0', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['version']);
        expect(code).toBe(EXIT_OK);
        expect(spy).toHaveBeenCalledWith(expect.any(String));
        spy.mockRestore();
    });

    test('--help should print usage and exit 0', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['--help']);
        expect(code).toBe(EXIT_OK);
        expect(spy).toHaveBeenCalledWith(ONESHOT_USAGE);
        spy.mockRestore();
    });

    test('unknown command should print usage on stderr and exit 1', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const code = await runOneShot(['snooze']);
        expect(code).toBe(EXIT_ERROR);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('snooze'));
        spy.mockRestore();
    });

    test('should strip interpreter and script path (node dist/index version)', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['node', 'dist/index', 'version']);
        expect(code).toBe(EXIT_OK);
        expect(spy).toHaveBeenCalledWith(expect.any(String));
        spy.mockRestore();
    });

    test('should run version with wud version', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['wud', 'version']);
        expect(code).toBe(EXIT_OK);
        expect(spy).toHaveBeenCalledWith(expect.any(String));
        spy.mockRestore();
    });

    test('should default to watch with empty argv []', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                {
                    container: buildContainer({ result: { tag: '1.0.0' } }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot([]);
        expect(code).toBe(EXIT_OK);
        spy.mockRestore();
    });

    test('should default to watch with ["node", "dist/index"]', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                {
                    container: buildContainer({ result: { tag: '1.0.0' } }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['node', 'dist/index']);
        expect(code).toBe(EXIT_OK);
        spy.mockRestore();
    });

    test('should default to watch with ["wud"]', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                {
                    container: buildContainer({ result: { tag: '1.0.0' } }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['wud']);
        expect(code).toBe(EXIT_OK);
        spy.mockRestore();
    });

    test('should run watch with ["node", "dist/index", "watch"]', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                {
                    container: buildContainer({ result: { tag: '1.0.0' } }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['node', 'dist/index', 'watch']);
        expect(code).toBe(EXIT_OK);
        spy.mockRestore();
    });

    test('should fail with ["wud", "unknown"]', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const code = await runOneShot(['wud', 'unknown']);
        expect(code).toBe(EXIT_ERROR);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('unknown'));
        spy.mockRestore();
    });

    test('should strip a binary alias (wud watch)', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                {
                    container: buildContainer({ result: { tag: '1.0.0' } }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['wud', 'watch']);
        expect(code).toBe(EXIT_OK);
        spy.mockRestore();
    });

    test('should report an unknown command after program tokens', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const code = await runOneShot(['node', 'dist/index', 'snooze']);
        expect(code).toBe(EXIT_ERROR);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('snooze'));
        spy.mockRestore();
    });

    test('should exit 1 when no watcher is registered', async () => {
        const code = await runOneShot(['watch']);
        expect(code).toBe(EXIT_ERROR);
    });

    test('should exit 1 when the Docker socket is unreachable', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([], {
                ping: jest.fn().mockRejectedValue(new Error('Cannot connect')),
            }),
        };
        const code = await runOneShot(['watch']);
        expect(code).toBe(EXIT_ERROR);
    });

    test('should print the JSON array and exit 0 when no update', async () => {
        const container = buildContainer({
            result: { tag: '1.0.0' },
        });
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([{ container, changed: false }]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['watch']);
        expect(code).toBe(EXIT_OK);
        expect(spy).toHaveBeenCalledTimes(1);
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output).toHaveLength(1);
        expect(output[0].updateAvailable).toBe(false);
        spy.mockRestore();
    });

    test('--fail-on-update should exit 1 when updates are available', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                { container: buildContainer(), changed: true },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['watch', '--fail-on-update']);
        expect(code).toBe(EXIT_ERROR);
        // Output is still printed regardless of the exit code
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    test('--fail-on-update should exit 0 when no update is available', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                {
                    container: buildContainer({ result: { tag: '1.0.0' } }),
                    changed: false,
                },
            ]),
        };
        const code = await runOneShot(['watch', '--fail-on-update']);
        expect(code).toBe(EXIT_OK);
        spy.mockRestore();
    });

    test('--update-available should only output updated containers', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                { container: buildContainer(), changed: true },
                {
                    container: buildContainer({
                        id: 'no-update',
                        result: { tag: '1.0.0' },
                    }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['watch', '--update-available']);
        expect(code).toBe(EXIT_OK);
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output).toHaveLength(1);
        expect(output[0].id).toBe('container-1');
        spy.mockRestore();
    });

    test('--format=ndjson should print one JSON object per line', async () => {
        mockRegistryState.watcher = {
            'docker.local': buildWatcher([
                { container: buildContainer(), changed: true },
                { container: buildContainer({ id: 'second' }), changed: true },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['watch', '--format=ndjson']);
        expect(code).toBe(EXIT_OK);
        const lines = spy.mock.calls[0][0].split('\n');
        expect(lines).toHaveLength(2);
        spy.mockRestore();
    });

    test('should merge reports from multiple watchers sorted deterministically', async () => {
        mockRegistryState.watcher = {
            'docker.z': buildWatcher([
                {
                    container: buildContainer({ id: 'z1', name: 'zeta' }),
                    changed: false,
                },
            ]),
            'docker.a': buildWatcher([
                {
                    container: buildContainer({ id: 'a1', name: 'alpha' }),
                    changed: false,
                },
            ]),
        };
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const code = await runOneShot(['watch']);
        expect(code).toBe(EXIT_OK);
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.map((c) => c.id)).toEqual(['a1', 'z1']);
        spy.mockRestore();
    });

    test('technical error during watch should exit 1', async () => {
        mockRegistryState.watcher = {
            'docker.local': {
                watch: jest.fn().mockRejectedValue(new Error('boom')),
            },
        };
        const code = await runOneShot(['watch']);
        expect(code).toBe(EXIT_ERROR);
    });
});

describe('exitOneshot', () => {
    test('should flush stdout and stderr and exit with the given code', () => {
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });
        const stdoutSpy = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation((_chunk, callback) => {
                callback?.();
                return true;
            });
        const stderrSpy = jest
            .spyOn(process.stderr, 'write')
            .mockImplementation((_chunk, callback) => {
                callback?.();
                return true;
            });

        expect(() => exitOneshot(1)).toThrow('process.exit called');
        expect(stdoutSpy).toHaveBeenCalledWith('', expect.any(Function));
        expect(stderrSpy).toHaveBeenCalledWith('', expect.any(Function));

        exitSpy.mockRestore();
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
    });

    test('should flush stdout and stderr and exit 0', () => {
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });
        const stdoutSpy = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation((_chunk, callback) => {
                callback?.();
                return true;
            });
        const stderrSpy = jest
            .spyOn(process.stderr, 'write')
            .mockImplementation((_chunk, callback) => {
                callback?.();
                return true;
            });

        expect(() => exitOneshot(0)).toThrow('process.exit called');
        expect(stdoutSpy).toHaveBeenCalledWith('', expect.any(Function));
        expect(stderrSpy).toHaveBeenCalledWith('', expect.any(Function));

        exitSpy.mockRestore();
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
    });
});

describe('one-shot output parity with the store/API serialization', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wud-oneshot-'));
    const originalStorePath = process.env.WUD_STORE_PATH;
    const originalStoreFile = process.env.WUD_STORE_FILE;

    afterAll(() => {
        if (originalStorePath === undefined) {
            delete process.env.WUD_STORE_PATH;
        } else {
            process.env.WUD_STORE_PATH = originalStorePath;
        }
        if (originalStoreFile === undefined) {
            delete process.env.WUD_STORE_FILE;
        } else {
            process.env.WUD_STORE_FILE = originalStoreFile;
        }
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('should serialize exactly like GET /api/containers', async () => {
        // Point the store to a temp directory and re-import it fresh
        process.env.WUD_STORE_PATH = tmpDir;
        process.env.WUD_STORE_FILE = 'wud.sqlite';
        jest.resetModules();

        const store = await import('../store');
        await store.store.init();

        const storeContainer = await import('../store/container');
        const { serializeContainers: serialize } = await import('./oneshot');

        const container = buildContainer();

        // One-shot path: validated + store read-back shape cleaning, never persisted
        const oneShotOutput = serialize(
            [storeContainer.completeContainerShapeForApi(container)],
            'json',
        );

        // API path: persisted then read back through the store
        storeContainer.insertContainer(container);
        const storedOutput = serialize(storeContainer.getContainers(), 'json');

        expect(oneShotOutput).toEqual(storedOutput);
    });
});
