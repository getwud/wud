/**
 * One-shot headless mode (WUD_RUN_MODE=oneshot).
 * Runs a single watch scan, optionally notifies triggers, prints the JSON
 * container output on stdout and exits. No store file is created.
 */
import { byString, byValues } from 'sort-es';
import { getVersion } from '../configuration';
import log from '../log';
import { Container } from '../model/container';
import * as registry from '../registry';
import * as storeContainer from '../store/container';
import Watcher from '../watchers/Watcher';
import { waitForPendingEvents } from '../event';
import { bootstrap } from './bootstrap';

export const EXIT_OK = 0;
export const EXIT_ERROR = 1;

export type OutputFormat = 'json' | 'ndjson';

export interface OneShotParsedArgs {
    command: 'watch' | 'version' | 'help';
    updateAvailable: boolean;
    format: OutputFormat;
    failOnUpdate: boolean;
}

export const ONESHOT_USAGE = `WUD one-shot headless mode

Usage:
  wud                              Run a single watch scan and exit
  wud watch                        Alias of the default command
  wud watch --update-available     Only output containers with an update available
  wud watch --format=ndjson        Output one JSON object per line (default: JSON array)
  wud watch --fail-on-update       Exit non-zero when at least one update is available
  wud version                      Print the WUD version and exit
  wud --help                       Show this help

Environment:
  WUD_RUN_MODE=oneshot             Select the one-shot entry point (default: server)
  WUD_WATCHER_*                    Watcher configuration (same as the server)
  WUD_REGISTRY_*                   Registry configuration (same as the server)
  WUD_TRIGGER_*                    Optional triggers; without them output is pure JSON

Exit codes:
  0  Scan completed, no update available
  1  Technical error (Docker socket unreachable, invalid configuration, ...)
     or an update is available when --fail-on-update is set`;

const DEFAULT_ARGS: OneShotParsedArgs = {
    command: 'watch',
    updateAvailable: false,
    format: 'json',
    failOnUpdate: false,
};

/**
 * Test whether a token is a launch token (interpreter, entry point or CLI alias).
 */
export function isLaunchToken(token: string): boolean {
    if (!token) {
        return false;
    }
    const normalized = token.replace(/\\/g, '/');
    const base = normalized.split('/').pop() ?? '';
    return (
        base === 'node' ||
        base === 'node.exe' ||
        base === 'wud' ||
        base === 'index' ||
        base === 'index.js' ||
        normalized === 'dist/index' ||
        normalized === 'dist/index.js' ||
        normalized.endsWith('/dist/index') ||
        normalized.endsWith('/dist/index.js')
    );
}

/**
 * Strip leading launch tokens (`node`, `.../index`, `dist/index`, `wud`).
 * If only launch tokens are present, returns `[]`.
 */
export function stripProgramTokens(argv: string[]): string[] {
    const args = [...argv];
    while (args.length > 0 && isLaunchToken(args[0])) {
        args.shift();
    }
    return args;
}

/**
 * Parse the one-shot command line arguments (without the program tokens).
 * @param argv arguments (e.g. ["watch", "--format=ndjson"])
 * @returns the parsed arguments
 * @throws Error on unknown command or option
 */
export function parseArgs(argv: string[]): OneShotParsedArgs {
    const [first, ...rest] = argv;

    if (first === undefined) {
        return { ...DEFAULT_ARGS };
    }
    if (first === '--help' || first === '-h') {
        return { ...DEFAULT_ARGS, command: 'help' };
    }
    if (first === 'version') {
        if (rest.length > 0) {
            throw new Error(`Unexpected argument "${rest[0]}" after "version"`);
        }
        return { ...DEFAULT_ARGS, command: 'version' };
    }
    if (first === 'watch') {
        return parseWatchArgs(rest);
    }
    throw new Error(`Unknown command "${first}"`);
}

function parseWatchArgs(args: string[]): OneShotParsedArgs {
    const parsed: OneShotParsedArgs = { ...DEFAULT_ARGS };
    for (const arg of args) {
        if (arg === '--help' || arg === '-h') {
            return { ...parsed, command: 'help' };
        }
        if (arg === '--update-available') {
            parsed.updateAvailable = true;
        } else if (arg === '--fail-on-update') {
            parsed.failOnUpdate = true;
        } else if (arg.startsWith('--format=')) {
            const value = arg.substring('--format='.length);
            if (value !== 'json' && value !== 'ndjson') {
                throw new Error(
                    `Invalid --format value "${value}" (expected "json" or "ndjson")`,
                );
            }
            parsed.format = value;
        } else {
            throw new Error(`Unknown option "${arg}"`);
        }
    }
    return parsed;
}

/**
 * Undefined -> null replacer with the exact same semantics as the Express
 * "json replacer" configured in api/index.ts so absent fields serialize
 * as null instead of being dropped.
 */

function jsonReplacer(_key: string, value: unknown): unknown {
    return value === undefined ? null : value;
}

/**
 * Serialize containers the same way the HTTP API does:
 * same cleaning (validated Container model) and same undefined -> null
 * replacer as the Express "json replacer" used by the API.
 */
export function serializeContainers(
    containers: Container[],
    format: OutputFormat,
): string {
    if (format === 'ndjson') {
        return containers
            .map((container) => JSON.stringify(container, jsonReplacer))
            .join('\n');
    }
    return JSON.stringify(containers, jsonReplacer);
}

/**
 * Output-side mirror of the generic in-memory filter used by
 * storeContainer.getContainers (store/container.ts): every query entry must
 * match the container property. No additional scan logic is added.
 */
export function filterContainers(
    containers: Container[],
    query: Record<string, unknown>,
): Container[] {
    return containers.filter((container) =>
        Object.entries(query).every(
            ([key, value]) =>
                (container as unknown as Record<string, unknown>)[key] ===
                value,
        ),
    );
}

/**
 * Deterministic sort applied by GET /api/containers:
 * watcher -> name -> image.tag.value.
 */
export function sortContainers(containers: Container[]): Container[] {
    return containers.sort(
        byValues([
            [(container: Container) => container.watcher, byString()],
            [(container: Container) => container.name, byString()],
            [
                (container: Container) => container.image?.tag?.value ?? '',
                byString(),
            ],
        ]),
    );
}

interface DockerSocketProbe {
    ping(): Promise<boolean>;
}

/**
 * Probe the Docker socket of each Docker watcher before scanning so that an
 * unreachable socket is reported as a technical error (exit code 1) instead
 * of an empty successful scan.
 */
export async function probeDockerConnections(
    watchers: Watcher[],
): Promise<void> {
    for (const watcher of watchers) {
        const dockerApi = (
            watcher as unknown as {
                dockerApi?: DockerSocketProbe;
            }
        ).dockerApi;
        if (dockerApi && typeof dockerApi.ping === 'function') {
            await dockerApi.ping();
        }
    }
}

async function runWatch(parsed: OneShotParsedArgs): Promise<number> {
    try {
        await bootstrap({ mode: 'oneshot' });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.error(`WUD one-shot failed to start (${message})`);
        return EXIT_ERROR;
    }

    const watchers = Object.values(registry.getState().watcher);
    if (watchers.length === 0) {
        log.error(
            'No watcher registered: check your WUD_WATCHER_* configuration',
        );
        return EXIT_ERROR;
    }

    try {
        await probeDockerConnections(watchers);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.error(`Unable to reach the Docker socket (${message})`);
        return EXIT_ERROR;
    }

    let containers: Container[] = [];
    try {
        const watcherReports = await Promise.all(
            watchers.map((watcher) => watcher.watch()),
        );
        // Apply the store read-back shape cleaning so the serialized output
        // is byte-identical with GET /api/containers.
        containers = watcherReports
            .flat()
            .map((report) =>
                storeContainer.completeContainerShapeForApi(
                    report.container as Container,
                ),
            );
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.error(`Error during the watch (${message})`);
        return EXIT_ERROR;
    }

    await waitForPendingEvents();

    containers = sortContainers(containers);
    const updatesAvailable = containers.some(
        (container) => container.updateAvailable,
    );

    if (parsed.updateAvailable) {
        containers = filterContainers(containers, {
            updateAvailable: true,
        });
    }

    const output = serializeContainers(containers, parsed.format);
    if (output !== '') {
        console.log(output);
    }

    if (parsed.failOnUpdate && updatesAvailable) {
        return EXIT_ERROR;
    }
    return EXIT_OK;
}

/**
 * Flush stdout and stderr then terminate the process. A one-shot run must always exit:
 * the scan reuses the server engine, so trigger connections (e.g. MQTT
 * clients or Docker event streams) may keep the event loop alive, and a
 * pending exit could silently hang CI pipelines.
 * @param code the exit code to use
 */
export function exitOneshot(code: number): void {
    // The stdout and stderr streams are single queues: an empty write appended
    // after the output only resolves once everything before it was flushed, so
    // the CLI contract survives process.exit().
    process.stdout.write('', () => {
        process.stderr.write('', () => {
            process.exit(code);
        });
    });
}

/**
 * Run the one-shot headless mode.
 * @param argv command line arguments (everything after the entry point)
 * @returns the process exit code
 */
export async function runOneShot(argv: string[]): Promise<number> {
    let parsed: OneShotParsedArgs;
    try {
        parsed = parseArgs(stripProgramTokens(argv));
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`WUD one-shot: ${message}\n`);
        console.error(ONESHOT_USAGE);
        return EXIT_ERROR;
    }

    switch (parsed.command) {
        case 'help':
            console.log(ONESHOT_USAGE);
            return EXIT_OK;
        case 'version':
            console.log(getVersion());
            return EXIT_OK;
        case 'watch':
        default:
            return runWatch(parsed);
    }
}
