import { execSync } from 'child_process';
import * as https from 'https';
import * as os from 'os';
import * as semver from 'semver';
import { IncomingHttpHeaders, IncomingMessage } from 'http';

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 500;
const MAX_RETRY_AFTER_MS = 10000;
const PAGE_CAP = 200;
const TRAVERSAL_DEADLINE_MS = 90000;
const ORACLE_BUDGET_MS = 5 * 60 * 1000;
const BODY_EXCERPT_LENGTH = 200;

const RATE_LIMITED_BODY = /TOOMANYREQUESTS|rate.?limit|too many requests/i;
const RETRYABLE_NETWORK = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|socket hang up/i;

const MANIFEST_ACCEPT = 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json';

interface HttpResult {
    data: string;
    headers: IncomingHttpHeaders;
    statusCode: number;
}

/**
 * Wall-clock guard for a single resolution, plus a per-process budget shared by all of them.
 */
let oracleSpentMs = 0;

class Deadline {
    private readonly startedAt = Date.now();

    private readonly label: string;

    constructor(label: string) {
        this.label = label;
    }

    check(pages = 0): void {
        const elapsed = Date.now() - this.startedAt;
        if (elapsed > TRAVERSAL_DEADLINE_MS) {
            throw new Error(`Oracle traversal deadline exceeded (${this.label}, ${pages} pages)`);
        }
        if (oracleSpentMs + elapsed > ORACLE_BUDGET_MS) {
            throw new Error(`Oracle budget exceeded (${this.label}, ${Math.round((oracleSpentMs + elapsed) / 1000)}s)`);
        }
    }

    settle(): void {
        oracleSpentMs += Date.now() - this.startedAt;
    }
}

interface RequestContext {
    label: string;
    deadline?: Deadline;
    renewAuth?: () => Promise<string>;
}

/**
 * Map Node.js os.arch() values to Docker manifest platform architectures.
 */
function getDockerArchitecture(): string {
    const arch = os.arch();
    switch (arch) {
    case 'arm64': return 'arm64';
    case 'x64': return 'amd64';
    case 'arm': return 'arm';
    case 'ia32': return '386';
    default: return 'amd64';
    }
}

/**
 * Get the architecture of a locally pulled image (wud resolves digests for the
 * architecture of the watched container's image, not the host's).
 */
function getLocalImageArchitecture(imageRef: string): string | null {
    try {
        return execSync(`docker image inspect --format '{{.Architecture}}' ${imageRef}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
    } catch {
        return null;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/** Strip bearer/basic material so a failure excerpt can never leak credentials. */
function redact(text: string): string {
    return text
        .replace(/("(?:access_)?token"\s*:\s*")[^"]*/gi, '$1<redacted>')
        .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 <redacted>');
}

function excerpt(body: string): string {
    return redact(body).replace(/\s+/g, ' ').slice(0, BODY_EXCERPT_LENGTH);
}

/**
 * Perform a single HTTPS request. Never rejects on a non-2xx status; only on transport errors.
 */
function request(url: string, options: https.RequestOptions = {}): Promise<HttpResult> {
    return new Promise((resolve, reject) => {
        const method = (options.method || 'GET').toUpperCase();
        const onResponse = (res: IncomingMessage) => {
            let data = '';
            res.setEncoding('utf8');
            // A HEAD response carries no body; the data listener still puts it in
            // flowing mode so 'end' fires.
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve({ data, headers: res.headers, statusCode: res.statusCode || 0 }));
        };
        const req = method === 'GET'
            ? https.get(url, options, onResponse)
            : https.request(url, options, onResponse);
        req.on('error', reject);
        if (method !== 'GET') {
            req.end();
        }
    });
}

function isRetryableStatus(statusCode: number, body: string): boolean {
    if (statusCode === 408 || statusCode === 429 || statusCode >= 500) {
        return true;
    }
    // GHCR answers anonymous-abuse throttling with a 403, so only rate-limit 403s are retried.
    if (statusCode === 403) {
        return RATE_LIMITED_BODY.test(body);
    }
    return false;
}

function backoffDelay(attempt: number, headers: IncomingHttpHeaders): number {
    const retryAfter = headers['retry-after'];
    if (typeof retryAfter === 'string' && retryAfter.trim() !== '') {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) {
            return Math.min(Math.max(seconds, 0) * 1000, MAX_RETRY_AFTER_MS);
        }
        const at = Date.parse(retryAfter);
        if (!Number.isNaN(at)) {
            return Math.min(Math.max(at - Date.now(), 0), MAX_RETRY_AFTER_MS);
        }
    }
    const base = BASE_BACKOFF_MS * 2 ** (attempt - 1);
    return Math.round(base * (0.75 + Math.random() * 0.5));
}

/**
 * Perform a request with bounded retries. Throws (never returns a partial or non-2xx result)
 * with the observed status and a redacted body excerpt once the policy is exhausted.
 */
async function requestWithRetry(
    url: string,
    options: https.RequestOptions,
    ctx: RequestContext,
): Promise<HttpResult> {
    const opts: https.RequestOptions = { ...options, headers: { ...(options.headers || {}) } };
    let attempt = 0;
    let authRenewed = false;

    for (;;) {
        attempt += 1;
        if (ctx.deadline) {
            ctx.deadline.check();
        }

        let res: HttpResult | null = null;
        let renewed = false;
        try {
            // Attempts are inherently sequential: each one depends on the previous outcome.
            // eslint-disable-next-line no-await-in-loop
            res = await request(url, opts);
        } catch (e: any) {
            if (!RETRYABLE_NETWORK.test(e.message) || attempt >= MAX_ATTEMPTS) {
                throw new Error(`${ctx.label}: request failed after ${attempt} attempt(s) for ${url}: ${e.message}`);
            }
        }

        if (res) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                return res;
            }
            // A long traversal can outlive an anonymous registry token; re-mint it once.
            if (res.statusCode === 401 && ctx.renewAuth && !authRenewed) {
                authRenewed = true;
                renewed = true;
                // eslint-disable-next-line no-await-in-loop
                (opts.headers as Record<string, string>).Authorization = await ctx.renewAuth();
                console.warn(`[oracle] ${ctx.label}: attempt ${attempt} got 401, re-minted token and retrying ${url}`);
            } else if (!isRetryableStatus(res.statusCode, res.data) || attempt >= MAX_ATTEMPTS) {
                throw new Error(`${ctx.label}: HTTP ${res.statusCode} after ${attempt} attempt(s) for ${url}; body: ${excerpt(res.data)}`);
            }
        }

        if (!renewed) {
            const delay = res ? backoffDelay(attempt, res.headers) : backoffDelay(attempt, {});
            console.warn(`[oracle] ${ctx.label}: attempt ${attempt} ${res ? `status ${res.statusCode}` : 'network error'}, retrying in ${delay}ms - ${url}`);
            // eslint-disable-next-line no-await-in-loop
            await sleep(delay);
        }
    }
}

function parseJson<T>(res: HttpResult, url: string, label: string): T {
    try {
        return JSON.parse(res.data) as T;
    } catch (e: any) {
        throw new Error(`${label}: invalid JSON from ${url} (status ${res.statusCode}): ${excerpt(res.data)}`);
    }
}

async function requestJson<T>(
    url: string,
    options: https.RequestOptions,
    ctx: RequestContext,
): Promise<T> {
    const res = await requestWithRetry(url, options, ctx);
    return parseJson<T>(res, url, ctx.label);
}

/**
 * Build a Basic auth header when the environment supplies credentials, otherwise stay anonymous.
 */
function basicAuthHeader(userVar: string, secretVar: string): Record<string, string> {
    const user = process.env[userVar];
    const secret = process.env[secretVar];
    if (!user || !secret) {
        return {};
    }
    return { Authorization: `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}` };
}

async function mintGhcrToken(image: string, ctx: RequestContext): Promise<string> {
    const url = `https://ghcr.io/token?scope=repository:${image}:pull`;
    const data = await requestJson<{ token?: string }>(url, { headers: basicAuthHeader('GITHUB_USERNAME', 'GITHUB_TOKEN') }, ctx);
    if (!data.token) {
        throw new Error(`${ctx.label}: no token returned by ${url}`);
    }
    return `Bearer ${data.token}`;
}

async function mintGitlabToken(image: string, ctx: RequestContext): Promise<string> {
    const url = `https://gitlab.com/jwt/auth?service=container_registry&scope=repository:${image}:pull`;
    const data = await requestJson<{ token?: string }>(url, { headers: basicAuthHeader('GITLAB_USERNAME', 'GITLAB_TOKEN') }, ctx);
    if (!data.token) {
        throw new Error(`${ctx.label}: no token returned by ${url}`);
    }
    return `Bearer ${data.token}`;
}

async function mintDockerHubToken(repo: string, ctx: RequestContext): Promise<string> {
    const url = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`;
    const data = await requestJson<{ token?: string }>(url, {}, ctx);
    if (!data.token) {
        throw new Error(`${ctx.label}: no token returned by ${url}`);
    }
    return `Bearer ${data.token}`;
}

function hubRepo(image: string): string {
    return image.includes('/') ? image : `library/${image}`;
}

function nextPageUrl(link: string | string[] | undefined, currentUrl: string): string | null {
    const value = Array.isArray(link) ? link.join(', ') : link;
    if (!value || !value.includes('rel="next"')) {
        return null;
    }
    const match = value.match(/<([^>]*)>;\s*rel="next"/);
    if (!match) {
        return null;
    }
    const next = match[1];
    return next.startsWith('/') ? `${currentUrl.split('/v2')[0]}${next}` : next;
}

interface TagCollection {
    tags: string[];
    pages: number;
}

/**
 * Walk a Docker Registry v2 /tags/list endpoint to completion. Any incomplete enumeration throws.
 */
async function collectV2Tags(
    host: string,
    image: string,
    label: string,
    mintToken: (ctx: RequestContext) => Promise<string>,
    deadline: Deadline,
): Promise<TagCollection> {
    const ctx: RequestContext = { label, deadline };
    let auth = await mintToken(ctx);
    ctx.renewAuth = async () => {
        auth = await mintToken({ label, deadline });
        return auth;
    };

    let url: string | null = `https://${host}/v2/${image}/tags/list?n=1000`;
    let tags: string[] = [];
    let pages = 0;

    while (url) {
        if (pages >= PAGE_CAP) {
            throw new Error(`Pagination cap (${PAGE_CAP}) reached for ${image} on ${host}; last=${url}`);
        }
        deadline.check(pages);
        // The next URL only exists once this page's Link header has been read.
        // eslint-disable-next-line no-await-in-loop
        const res = await requestWithRetry(url, { headers: { Authorization: auth } }, ctx);
        const body = parseJson<{ tags?: string[] | null }>(res, url, label);
        // GHCR answers {"tags": null} for an empty repository.
        tags = tags.concat(body.tags || []);
        url = nextPageUrl(res.headers.link, url);
        pages += 1;
    }

    return { tags, pages };
}

interface HubTagPage {
    results?: { name: string }[] | null;
}

interface QuayTagPage {
    tags?: { name: string }[] | null;
    has_additional?: boolean;
}

async function collectQuayTags(
    image: string,
    label: string,
    deadline: Deadline,
): Promise<TagCollection> {
    const ctx: RequestContext = { label, deadline };
    let url: string | null = `https://quay.io/api/v1/repository/${image}/tag/?limit=100`;
    let tags: string[] = [];
    let pages = 0;

    while (url) {
        if (pages >= PAGE_CAP) {
            throw new Error(`Pagination cap (${PAGE_CAP}) reached for ${image} on quay.io; last=${url}`);
        }
        deadline.check(pages);
        const pageUrl: string = url;
        // has_additional is only known once the current page has been fetched.
        // eslint-disable-next-line no-await-in-loop
        const data = await requestJson<QuayTagPage>(pageUrl, {}, ctx);
        tags = tags.concat((data.tags || []).map((t) => t.name));
        pages += 1;
        url = data.has_additional ? `https://quay.io/api/v1/repository/${image}/tag/?limit=100&page=${pages + 1}` : null;
    }

    return { tags, pages };
}

function sortTags(tags: string[]): string[] {
    return tags.slice().sort((a, b) => {
        const cleanA = semver.clean(a) || semver.coerce(a);
        const cleanB = semver.clean(b) || semver.coerce(b);

        if (!cleanA && !cleanB) return b.localeCompare(a);
        if (!cleanA) return 1;
        if (!cleanB) return -1;

        const cmp = semver.rcompare(cleanA, cleanB);
        if (cmp !== 0) return cmp;

        return b.localeCompare(a);
    });
}

/**
 * Endpoint the traversal actually hits. Cache keys are built from this, not from the wud
 * registry alias, so aliases sharing an endpoint (ghcr.public / lscr.private) share one traversal.
 */
function versionEndpoint(registry: string, image: string): string {
    switch (registry) {
    case 'hub.public': return `hub.docker.com/v2/${hubRepo(image)}`;
    case 'ghcr.public':
    case 'ghcr.private':
    case 'lscr.private': return `ghcr.io/v2/${image}`;
    case 'gitlab.private': return `registry.gitlab.com/v2/${image}`;
    case 'quay.public': return `quay.io/v2/${image}`;
    default: return `${registry}/v2/${image}`;
    }
}

function digestEndpoint(registry: string, image: string): string {
    switch (registry) {
    case 'hub.public': return `registry-1.docker.io/v2/${hubRepo(image)}`;
    case 'ghcr.public':
    case 'ghcr.private':
    case 'lscr.private': return `ghcr.io/v2/${image}`;
    default: return `${registry}/v2/${image}`;
    }
}

// Per-process memoization; it would silently degrade to per-worker if --parallel were ever
// added to the cucumber invocation.
const cache = new Map<string, Promise<string>>();

function cached(key: string, work: () => Promise<string>): Promise<string> {
    const hit = cache.get(key);
    if (hit) {
        return hit;
    }
    const pending = work().catch((e) => {
        cache.delete(key);
        throw e;
    });
    cache.set(key, pending);
    return pending;
}

async function resolveLatestVersion(
    registry: string,
    image: string,
    pattern: string,
): Promise<string> {
    const label = `${image}@${registry}`;
    const regex = new RegExp(pattern);
    const deadline = new Deadline(label);
    let tags: string[] = [];
    let pages = 1;

    try {
        if (registry === 'hub.public') {
            // ordering=last_updated is newest-first; the DRF-looking ordering=-last_updated is
            // inverted here and returns oldest-first.
            const url = `https://hub.docker.com/v2/repositories/${hubRepo(image)}/tags?page_size=100&ordering=last_updated`;
            const data = await requestJson<HubTagPage>(url, {}, { label, deadline });
            tags = (data.results || []).map((r) => r.name);
        } else if (registry === 'ghcr.public' || registry === 'ghcr.private' || registry === 'lscr.private') {
            const collected = await collectV2Tags('ghcr.io', image, label, (ctx) => mintGhcrToken(image, ctx), deadline);
            tags = collected.tags;
            pages = collected.pages;
        } else if (registry === 'gitlab.private') {
            const collected = await collectV2Tags('registry.gitlab.com', image, label, (ctx) => mintGitlabToken(image, ctx), deadline);
            tags = collected.tags;
            pages = collected.pages;
        } else if (registry === 'quay.public') {
            const collected = await collectQuayTags(image, label, deadline);
            tags = collected.tags;
            pages = collected.pages;
        } else {
            throw new Error(`Unsupported registry: ${registry}`);
        }

        if (pages > 1) {
            console.log(`[oracle] ${label}: enumerated ${tags.length} tags over ${pages} pages`);
        }

        const sortedTags = sortTags(tags.filter((t) => regex.test(t)));

        if (sortedTags.length === 0) {
            throw new Error(`No tags found matching pattern ${pattern} for ${image} (${tags.length} tags enumerated over ${pages} page(s) on ${registry})`);
        }

        return sortedTags[0];
    } catch (e: any) {
        console.error(`Error fetching latest version for ${image} on ${registry}: ${e.message}`);
        throw e;
    } finally {
        deadline.settle();
    }
}

interface ManifestIndex {
    manifests?: {
        digest: string;
        platform?: { architecture?: string; os?: string };
    }[];
}

async function resolveLatestDigest(registry: string, image: string, tag: string): Promise<string> {
    const label = `${image}:${tag}@${registry}`;
    const deadline = new Deadline(label);

    try {
        let url: string;
        let auth: string;
        let arch: string;

        if (registry === 'ghcr.public') {
            auth = await mintGhcrToken(image, { label, deadline });
            url = `https://ghcr.io/v2/${image}/manifests/${tag}`;
            arch = getDockerArchitecture();
        } else if (registry === 'hub.public') {
            const repo = hubRepo(image);
            auth = await mintDockerHubToken(repo, { label, deadline });
            url = `https://registry-1.docker.io/v2/${repo}/manifests/${tag}`;
            arch = getLocalImageArchitecture(`${repo}:${tag}`) || getDockerArchitecture();
        } else {
            throw new Error(`getLatestDigest not implemented for registry: ${registry}`);
        }

        const options: https.RequestOptions = {
            headers: { Authorization: auth, Accept: MANIFEST_ACCEPT },
        };
        const ctx: RequestContext = { label, deadline };
        const manifest = await requestJson<ManifestIndex>(url, options, ctx);

        // For a manifest list / index, pick the manifest matching the relevant architecture.
        if (manifest.manifests) {
            const match = manifest.manifests.find((m) => m.platform && m.platform.architecture === arch && m.platform.os === 'linux');
            if (match) {
                return match.digest;
            }
        }

        // A single manifest's digest is the hash of the body, so ask the registry for it via HEAD.
        const head = await requestWithRetry(url, { ...options, method: 'HEAD' }, ctx);
        const digest = head.headers['docker-content-digest'];
        if (!digest) {
            throw new Error(`Digest header not found for ${image}:${tag} on ${registry} (status ${head.statusCode})`);
        }
        return digest as string;
    } catch (e: any) {
        console.error(`Error fetching latest digest for ${image}:${tag} on ${registry}: ${e.message}`);
        throw e;
    } finally {
        deadline.settle();
    }
}

/**
 * Registry Oracle for fetching latest tags and digests.
 */
const registryOracle = {
    /**
     * Get the latest version for an image.
     */
    async getLatestVersion(registry: string, image: string, pattern: string = '.*'): Promise<string> {
        if (registry === 'ecr.private') {
            return '2.0.0';
        }
        return cached(`v|${versionEndpoint(registry, image)}|${pattern}`, () => resolveLatestVersion(registry, image, pattern));
    },

    /**
     * Get the latest digest for an image.
     */
    async getLatestDigest(registry: string, image: string, tag: string = 'latest'): Promise<string> {
        return cached(`d|${digestEndpoint(registry, image)}|${tag}`, () => resolveLatestDigest(registry, image, tag));
    },
};

export default registryOracle;
