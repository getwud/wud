import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const ENTRYPOINT_PATH = path.resolve(__dirname, '../../Docker.entrypoint.sh');

interface EntrypointFixture {
    dir: string;
    cleanup: () => void;
}

function createFixture(
    nodeScript: string,
    pinoPrettyScript?: string,
): EntrypointFixture {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wud-entrypoint-test-'));
    fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'node_modules/.bin'), { recursive: true });

    fs.writeFileSync(path.join(dir, 'dist/index.js'), nodeScript, 'utf8');

    const prettyBin = path.join(dir, 'node_modules/.bin/pino-pretty');
    const defaultPretty = `#!/usr/bin/env node
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
    process.stdout.write('[pretty] ' + line + '\\n');
});
rl.on('close', () => {
    setTimeout(() => {
        process.stdout.write('[pretty] flushed\\n');
        process.exit(0);
    }, 50);
});
`;
    fs.writeFileSync(prettyBin, pinoPrettyScript ?? defaultPretty, {
        mode: 0o755,
    });

    return {
        dir,
        cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
}

function runEntrypoint(
    cwd: string,
    args: string[],
    envOverrides: Record<string, string> = {},
): {
    child: ChildProcess;
    getStdout: () => string;
    getStderr: () => string;
    waitForStdout: (
        pattern: string | RegExp,
        timeoutMs?: number,
    ) => Promise<void>;
    result: Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
        stdout: string;
        stderr: string;
    }>;
} {
    let stdout = '';
    let stderr = '';
    const stdoutWaiters: Array<{
        pattern: string | RegExp;
        resolve: () => void;
    }> = [];

    const env = { ...process.env };
    delete env.WUD_LOG_FORMAT;
    delete env.WUD_RUN_MODE;
    Object.assign(env, envOverrides);

    const child = spawn('bash', [ENTRYPOINT_PATH, ...args], {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
        for (let i = stdoutWaiters.length - 1; i >= 0; i -= 1) {
            const waiter = stdoutWaiters[i];
            const matched =
                typeof waiter.pattern === 'string'
                    ? stdout.includes(waiter.pattern)
                    : waiter.pattern.test(stdout);
            if (matched) {
                stdoutWaiters.splice(i, 1);
                waiter.resolve();
            }
        }
    });

    child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    const waitForStdout = (pattern: string | RegExp, timeoutMs = 5000) =>
        new Promise<void>((resolve, reject) => {
            const matched =
                typeof pattern === 'string'
                    ? stdout.includes(pattern)
                    : pattern.test(stdout);
            if (matched) {
                resolve();
                return;
            }
            const timer = setTimeout(() => {
                reject(
                    new Error(
                        `Timed out waiting for stdout ${String(pattern)}. Got stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`,
                    ),
                );
            }, timeoutMs);
            stdoutWaiters.push({
                pattern,
                resolve: () => {
                    clearTimeout(timer);
                    resolve();
                },
            });
        });

    const result = new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
        stdout: string;
        stderr: string;
    }>((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (code, signal) => {
            resolve({ code, signal, stdout, stderr });
        });
    });

    return {
        child,
        getStdout: () => stdout,
        getStderr: () => stderr,
        waitForStdout,
        result,
    };
}

describe('Docker.entrypoint.sh', () => {
    const cleanupChild = (child?: ChildProcess) => {
        if (child && child.exitCode === null) {
            child.kill('SIGKILL');
        }
    };

    test('should preserve non-zero exit code from node instead of pino-pretty exit 0', async () => {
        const fixture = createFixture(`
console.log('fatal-startup-error');
process.exit(42);
`);
        let child: ChildProcess | undefined;
        try {
            const run = runEntrypoint(fixture.dir, ['node', 'dist/index']);
            child = run.child;
            const res = await run.result;

            expect(res.code).toBe(42);
            expect(res.signal).toBeNull();
            expect(res.stdout).toContain('[pretty] fatal-startup-error');
            expect(res.stdout).toContain('[pretty] flushed');
        } finally {
            cleanupChild(child);
            fixture.cleanup();
        }
    });

    test('should forward SIGTERM to node, wait for graceful shutdown, flush pino-pretty, and exit 0', async () => {
        const fixture = createFixture(`
process.on('SIGTERM', () => {
    console.log('received-sigterm');
    setTimeout(() => {
        console.log('graceful-shutdown-complete');
        process.exit(0);
    }, 150);
});
console.log('ready');
setInterval(() => {}, 1000);
`);
        let child: ChildProcess | undefined;
        try {
            const run = runEntrypoint(fixture.dir, ['node', 'dist/index']);
            child = run.child;
            await run.waitForStdout('[pretty] ready');

            run.child.kill('SIGTERM');
            const res = await run.result;

            expect(res.code).toBe(0);
            expect(res.signal).toBeNull();
            expect(res.stdout).toContain('[pretty] received-sigterm');
            expect(res.stdout).toContain('[pretty] graceful-shutdown-complete');
            expect(res.stdout).toContain('[pretty] flushed');
        } finally {
            cleanupChild(child);
            fixture.cleanup();
        }
    });

    test('should survive repeated SIGTERM and SIGINT signals during shutdown and preserve node exit code', async () => {
        const fixture = createFixture(`
let shuttingDown = false;
const onSignal = (sig) => {
    console.log('got-' + sig);
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    setTimeout(() => {
        console.log('shutdown-done');
        process.exit(0);
    }, 250);
};
process.on('SIGTERM', () => onSignal('SIGTERM'));
process.on('SIGINT', () => onSignal('SIGINT'));
console.log('ready');
setInterval(() => {}, 1000);
`);
        let child: ChildProcess | undefined;
        try {
            const run = runEntrypoint(fixture.dir, ['node', 'dist/index']);
            child = run.child;
            await run.waitForStdout('[pretty] ready');

            run.child.kill('SIGINT');
            await run.waitForStdout('[pretty] got-SIGINT');
            // Send duplicate signals while node is still shutting down
            run.child.kill('SIGTERM');
            run.child.kill('SIGINT');

            const res = await run.result;

            expect(res.code).toBe(0);
            expect(res.signal).toBeNull();
            expect(res.stdout).toContain('[pretty] shutdown-done');
            expect(res.stdout).toContain('[pretty] flushed');
        } finally {
            cleanupChild(child);
            fixture.cleanup();
        }
    });

    test('should preserve non-zero exit code when node shutdown times out with exit(1)', async () => {
        const fixture = createFixture(`
process.on('SIGTERM', () => {
    console.log('shutdown-timeout');
    setTimeout(() => process.exit(1), 100);
});
console.log('ready');
setInterval(() => {}, 1000);
`);
        let child: ChildProcess | undefined;
        try {
            const run = runEntrypoint(fixture.dir, ['node', 'dist/index']);
            child = run.child;
            await run.waitForStdout('[pretty] ready');

            run.child.kill('SIGTERM');
            const res = await run.result;

            expect(res.code).toBe(1);
            expect(res.stdout).toContain('[pretty] shutdown-timeout');
            expect(res.stdout).toContain('[pretty] flushed');
        } finally {
            cleanupChild(child);
            fixture.cleanup();
        }
    });

    test('should bypass pino-pretty when WUD_LOG_FORMAT=json', async () => {
        const fixture = createFixture(`
console.log('{"msg":"raw-json"}');
process.exit(0);
`);
        let child: ChildProcess | undefined;
        try {
            const run = runEntrypoint(fixture.dir, ['node', 'dist/index'], {
                WUD_LOG_FORMAT: 'json',
            });
            child = run.child;
            const res = await run.result;

            expect(res.code).toBe(0);
            expect(res.stdout.trim()).toBe('{"msg":"raw-json"}');
            expect(res.stdout).not.toContain('[pretty]');
        } finally {
            cleanupChild(child);
            fixture.cleanup();
        }
    });
});
