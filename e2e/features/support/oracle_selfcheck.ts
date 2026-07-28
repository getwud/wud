/**
 * Self-check for the registry oracle. Stubs the https module and asserts the hardening
 * contract: never truncate, retry the right statuses, cache per endpoint, evict failures,
 * stay anonymous without credentials.
 *
 * Run manually: cd e2e && npx ts-node features/support/oracle_selfcheck.ts
 * It monkeypatches https, so it must never be part of a real cucumber run.
 */
import * as assert from 'assert';
import * as https from 'https';
import { EventEmitter } from 'events';
import registryOracle from './registry_oracle';

interface StubResponse {
    statusCode: number;
    headers?: Record<string, string>;
    body?: string;
}

interface Recorded {
    method: string;
    url: string;
    headers: Record<string, any>;
}

type Router = (url: string, method: string) => StubResponse;

// A TS namespace import is a getter-only view of the module, so the stubs have to be
// installed on the underlying module object that every importer delegates to.
const httpsModule: { get: typeof https.get; request: typeof https.request } = require('https');

const realGet = httpsModule.get;
const realRequest = httpsModule.request;

let router: Router = () => ({ statusCode: 500, body: 'no route installed' });
let recorded: Recorded[] = [];

type FakeResponse = EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    setEncoding: () => void;
    resume: () => void;
};

type FakeRequest = EventEmitter & { end: () => void };

function fakeResponse(spec: StubResponse): FakeResponse {
    const res = new EventEmitter() as FakeResponse;
    res.statusCode = spec.statusCode;
    res.headers = spec.headers || {};
    res.setEncoding = () => {};
    res.resume = () => {};
    return res;
}

function fakeRequest(): FakeRequest {
    const req = new EventEmitter() as FakeRequest;
    req.end = () => {};
    return req;
}

function dispatch(method: string, url: string, options: any, cb: (res: any) => void): FakeRequest {
    recorded.push({ method, url, headers: (options && options.headers) || {} });
    const spec = router(url, method);
    const req = fakeRequest();
    setImmediate(() => {
        const res = fakeResponse(spec);
        cb(res);
        setImmediate(() => {
            if (method !== 'HEAD' && spec.body) {
                res.emit('data', spec.body);
            }
            res.emit('end');
        });
    });
    return req;
}

function normalize(args: any[]): { url: string; options: any; cb: (res: any) => void } {
    const [url, second, third] = args;
    if (typeof second === 'function') {
        return { url: String(url), options: {}, cb: second };
    }
    return { url: String(url), options: second || {}, cb: third };
}

function install(r: Router): void {
    router = r;
    recorded = [];
    (httpsModule as any).get = (...args: any[]) => {
        const { url, options, cb } = normalize(args);
        return dispatch('GET', url, options, cb);
    };
    (httpsModule as any).request = (...args: any[]) => {
        const { url, options, cb } = normalize(args);
        return dispatch(String(options.method || 'GET').toUpperCase(), url, options, cb);
    };
}

function restore(): void {
    (httpsModule as any).get = realGet;
    (httpsModule as any).request = realRequest;
}

const captured: string[] = [];
const realConsole = { log: console.log, warn: console.warn, error: console.error };

function captureConsole(): void {
    console.log = (...a: any[]) => { captured.push(`log ${a.join(' ')}`); };
    console.warn = (...a: any[]) => { captured.push(`warn ${a.join(' ')}`); };
    console.error = (...a: any[]) => { captured.push(`error ${a.join(' ')}`); };
}

function releaseConsole(): void {
    console.log = realConsole.log;
    console.warn = realConsole.warn;
    console.error = realConsole.error;
}

function warnings(): string[] {
    return captured.filter((line) => line.startsWith('warn'));
}

function countRequests(fragment: string): number {
    return recorded.filter((r) => r.url.includes(fragment)).length;
}

const TOKEN_OK: StubResponse = { statusCode: 200, body: JSON.stringify({ token: 'stub-token' }) };

function tagsPage(tags: string[], next?: string): StubResponse {
    return {
        statusCode: 200,
        headers: next ? { link: `<${next}>; rel="next"` } : {},
        body: JSON.stringify({ tags }),
    };
}

class ExpectationError extends Error {}

async function expectRejection(work: () => Promise<unknown>): Promise<Error> {
    let value: unknown;
    try {
        value = await work();
    } catch (e) {
        return e as Error;
    }
    throw new ExpectationError(`expected a rejection but resolved with ${String(value)}`);
}

interface CaseResult {
    n: number;
    name: string;
    ok: boolean;
    detail: string;
}

const results: CaseResult[] = [];

async function runCase(n: number, name: string, fn: () => Promise<string>): Promise<void> {
    captured.length = 0;
    captureConsole();
    try {
        const detail = await fn();
        results.push({
            n, name, ok: true, detail,
        });
    } catch (e: any) {
        results.push({
            n, name, ok: false, detail: e && e.message ? e.message : String(e),
        });
    } finally {
        releaseConsole();
        restore();
    }
}

async function main(): Promise<void> {
    // 1 - retry then succeed
    await runCase(1, 'retry-then-succeed (429 + Retry-After)', async () => {
        let tagCalls = 0;
        install((url) => {
            if (url.includes('/token')) return TOKEN_OK;
            tagCalls += 1;
            if (tagCalls === 1) {
                return { statusCode: 429, headers: { 'retry-after': '1' }, body: 'TOOMANYREQUESTS' };
            }
            return tagsPage(['1.0.0', '2.0.0']);
        });
        const started = Date.now();
        const version = await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case1', '^\\d+\\.\\d+\\.\\d+$');
        const elapsed = Date.now() - started;
        assert.strictEqual(version, '2.0.0');
        assert.ok(warnings().length >= 1, 'expected at least one retry warning');
        assert.ok(elapsed >= 900, `expected Retry-After delay to be honored, took ${elapsed}ms`);
        return `resolved 2.0.0 after ${tagCalls} attempts, ${warnings().length} warn, ${elapsed}ms`;
    });

    // 2 - exhausted retries
    await runCase(2, 'exhausted retries throw (always 429)', async () => {
        install((url) => (url.includes('/token') ? TOKEN_OK : { statusCode: 429, body: 'TOOMANYREQUESTS: rate limit' }));
        const error = await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case2', '.*'));
        assert.ok(/429/.test(error.message), `message must name the status: ${error.message}`);
        assert.ok(error.message.includes('/tags/list'), `message must name the URL: ${error.message}`);
        assert.strictEqual(countRequests('/tags/list'), 5, 'expected 5 attempts');
        return `threw after 5 attempts: ${error.message.slice(0, 60)}...`;
    });

    // 3 - non-retryable status
    await runCase(3, 'non-retryable 404 fails fast', async () => {
        install((url) => (url.includes('/token') ? TOKEN_OK : { statusCode: 404, body: 'not found' }));
        const error = await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case3', '.*'));
        assert.ok(/404/.test(error.message), error.message);
        assert.strictEqual(countRequests('/tags/list'), 1, 'expected exactly 1 attempt');
        return 'threw after exactly 1 attempt';
    });

    // 4 - 401 re-mints the token exactly once
    await runCase(4, '401 re-mints token once then succeeds', async () => {
        let tagCalls = 0;
        install((url) => {
            if (url.includes('/token')) return TOKEN_OK;
            tagCalls += 1;
            if (tagCalls === 1) return { statusCode: 401, body: 'unauthorized' };
            return tagsPage(['1.2.3', '1.3.0']);
        });
        const version = await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case4', '.*');
        assert.strictEqual(version, '1.3.0');
        assert.strictEqual(countRequests('/token'), 2, 'expected the token to be minted exactly twice (initial + re-mint)');
        return 'resolved 1.3.0, token minted 2x (1 re-mint)';
    });

    // 5 - 403 is retried only when the body says rate limit
    await runCase(5, '403 retried only when rate-limited', async () => {
        let tagCalls = 0;
        install((url) => {
            if (url.includes('/token')) return TOKEN_OK;
            tagCalls += 1;
            if (tagCalls === 1) {
                return { statusCode: 403, body: '{"errors":[{"code":"TOOMANYREQUESTS","message":"retry later"}]}' };
            }
            return tagsPage(['4.0.0']);
        });
        const version = await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case5a', '.*');
        assert.strictEqual(version, '4.0.0');
        assert.strictEqual(tagCalls, 2, 'rate-limited 403 should be retried');

        install((url) => (url.includes('/token') ? TOKEN_OK : { statusCode: 403, body: 'denied: insufficient scope' }));
        const error = await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case5b', '.*'));
        assert.ok(/403/.test(error.message), error.message);
        assert.strictEqual(countRequests('/tags/list'), 1, 'plain 403 must not be retried');
        return 'rate-limited 403 retried; plain 403 failed after 1 attempt';
    });

    // 6 - pagination cap exhaustion throws
    await runCase(6, 'pagination cap exhaustion throws', async () => {
        let page = 0;
        install((url) => {
            if (url.includes('/token')) return TOKEN_OK;
            page += 1;
            return tagsPage([`0.0.${page}`], `https://ghcr.io/v2/selfcheck/case6/tags/list?n=1000&last=${page}`);
        });
        const started = Date.now();
        const error = await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case6', '.*'));
        const elapsed = Date.now() - started;
        assert.ok(/Pagination cap \(200\) reached/.test(error.message), error.message);
        assert.strictEqual(countRequests('/tags/list'), 200, 'expected exactly 200 pages before the cap');
        assert.ok(elapsed < 20000, `cap exhaustion must stay bounded, took ${elapsed}ms`);
        return `threw at 200 pages in ${elapsed}ms`;
    });

    // 7 - endpoint-keyed cache collapses aliases
    await runCase(7, 'cache collapses duplicate resolutions', async () => {
        install((url) => (url.includes('/token') ? TOKEN_OK : tagsPage(['5.0.0', '5.1.0'])));
        const a = await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case7', '.*');
        const b = await registryOracle.getLatestVersion('lscr.private', 'selfcheck/case7', '.*');
        const c = await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case7', '.*');
        assert.deepStrictEqual([a, b, c], ['5.1.0', '5.1.0', '5.1.0']);
        assert.strictEqual(countRequests('/tags/list'), 1, 'three resolutions must share one traversal');
        return '3 resolutions (2 aliases) -> 1 traversal';
    });

    // 8 - failures are evicted from the cache
    await runCase(8, 'failure is not cached', async () => {
        let attempt = 0;
        install((url) => {
            if (url.includes('/token')) return TOKEN_OK;
            attempt += 1;
            return attempt === 1 ? { statusCode: 404, body: 'gone' } : tagsPage(['6.0.0']);
        });
        await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case8', '.*'));
        const version = await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case8', '.*');
        assert.strictEqual(version, '6.0.0');
        assert.strictEqual(countRequests('/tags/list'), 2, 'the second call must re-traverse');
        return 'failed call evicted, second call re-traversed';
    });

    // 9 - truncation regression: a partial enumeration must never be answered
    await runCase(9, 'truncation regression (page 2 rate limited)', async () => {
        const stale = ['3.2.2.5080-ls108', '3.0.1.4263-ls4', '2.9.0.1-ls1'];
        install((url) => {
            if (url.includes('/token')) return TOKEN_OK;
            if (!url.includes('last=')) {
                return tagsPage(stale, 'https://ghcr.io/v2/selfcheck/case9/tags/list?n=1000&last=page1');
            }
            return { statusCode: 429, headers: { 'retry-after': '0' }, body: 'TOOMANYREQUESTS' };
        });
        const error = await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case9', '.*'));
        assert.ok(!(error instanceof ExpectationError), `oracle returned a truncated result: ${error.message}`);
        assert.ok(/429/.test(error.message), `message must name the status: ${error.message}`);
        assert.ok(!/3\.2\.2/.test(error.message.replace(/https:\S+/g, '')), 'stale tag must not be reported as a result');
        return 'threw on partial enumeration instead of returning 3.2.2.x';
    });

    // 10 - auth degrades to anonymous and never leaks
    await runCase(10, 'anonymous fallback and credential redaction', async () => {
        const savedUser = process.env.GITHUB_USERNAME;
        const savedToken = process.env.GITHUB_TOKEN;
        try {
            delete process.env.GITHUB_USERNAME;
            delete process.env.GITHUB_TOKEN;
            install((url) => (url.includes('/token') ? TOKEN_OK : tagsPage(['7.0.0'])));
            await registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case10a', '.*');
            const anonymous = recorded.filter((r) => r.url.includes('/token'));
            assert.strictEqual(anonymous.length, 1);
            assert.strictEqual(anonymous[0].headers.Authorization, undefined, 'no Authorization header without credentials');

            process.env.GITHUB_USERNAME = 'selfcheck-user';
            process.env.GITHUB_TOKEN = 'selfcheck-secret-value';
            install((url) => {
                if (url.includes('/token')) return TOKEN_OK;
                return { statusCode: 429, headers: { 'retry-after': '0' }, body: 'TOOMANYREQUESTS' };
            });
            await expectRejection(() => registryOracle.getLatestVersion('ghcr.public', 'selfcheck/case10b', '.*'));
            const authed = recorded.filter((r) => r.url.includes('/token'));
            assert.ok(String(authed[0].headers.Authorization).startsWith('Basic '), 'credentials must be used when present');
            const leaked = captured.filter((line) => line.includes('selfcheck-secret-value') || /Basic [A-Za-z0-9+/=]{4,}/.test(line));
            assert.deepStrictEqual(leaked, [], 'credentials must never reach the log');
            return 'anonymous without env; Basic when set; nothing leaked to logs';
        } finally {
            if (savedUser === undefined) {
                delete process.env.GITHUB_USERNAME;
            } else {
                process.env.GITHUB_USERNAME = savedUser;
            }
            if (savedToken === undefined) {
                delete process.env.GITHUB_TOKEN;
            } else {
                process.env.GITHUB_TOKEN = savedToken;
            }
        }
    });

    let failed = 0;
    results.forEach((r) => {
        if (!r.ok) failed += 1;
        console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.n}: ${r.name} - ${r.detail}`);
    });
    console.log(`${results.length - failed}/${results.length} oracle self-check cases passed`);
    if (failed > 0) {
        process.exitCode = 1;
    }
}

// cucumber's --require globs this directory, so importing must stay inert.
if (require.main === module) {
    main().catch((e) => {
        restore();
        releaseConsole();
        console.error(`oracle self-check crashed: ${e && e.stack ? e.stack : e}`);
        process.exitCode = 1;
    });
}
