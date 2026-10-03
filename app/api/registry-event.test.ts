import express from 'express';
import request from 'supertest';
import { init, parseHints, matches, getConfigurations } from './registry-event';
import * as configuration from '../configuration';
import * as registry from '../registry';
import * as store from '../store/container';
import * as event from '../event';
import { Container } from '../model/container';
import Trigger from '../triggers/providers/Trigger';

jest.mock('../registry');
jest.mock('../store/container');
jest.mock('../event');

const digest = `sha256:${'a'.repeat(64)}`;
const target = {
    repository: 'apps/test',
    tag: 'latest',
    digest,
    mediaType: 'application/vnd.oci.image.manifest.v1+json',
    url: 'https://registry.example.com/v2/apps/test/manifests/latest',
};
const payload = { events: [{ action: 'push', target }] };
const container = {
    id: 'one',
    watcher: 'local',
    image: {
        registry: { url: 'https://registry.example.com/v2' },
        name: 'apps/test',
        tag: { value: 'latest' },
        digest: { watch: false },
    },
} as Container;
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('registry notification receiver', () => {
    let watcher: {
        name: string;
        getContainers: jest.Mock;
        processWatchContainers: jest.Mock;
    };
    let app: express.Express;
    beforeEach(() => {
        jest.clearAllMocks();
        watcher = {
            name: 'local',
            getContainers: jest.fn().mockResolvedValue([container]),
            processWatchContainers: jest
                .fn()
                .mockResolvedValue([{ container, changed: true }]),
        };
        jest.mocked(registry.getState).mockReturnValue({
            watcher: { 'docker.local': watcher },
        } as unknown as registry.RegistryState);
        jest.mocked(store.getContainers).mockReturnValue([container]);
        app = express();
        app.use(
            '/events/registry',
            init({
                local: { enabled: true, token: 'secret' },
                disabled: { enabled: false },
            }),
        );
    });
    const send = (
        app: express.Express,
        body = payload,
        token = 'Bearer secret',
    ) =>
        request(app)
            .post('/events/registry/gitlab/local')
            .set('Authorization', token)
            .set(
                'Content-Type',
                'application/vnd.docker.distribution.events.v2+json',
            )
            .send(JSON.stringify(body));

    test('authenticates native vendor notifications and emits only matched batch reports', async () => {
        expect((await send(app)).status).toBe(202);
        await settle();
        expect(watcher.getContainers).toHaveBeenCalledTimes(1);
        expect(watcher.processWatchContainers).toHaveBeenCalledWith([
            container,
        ]);
        expect(event.emitContainerReports).toHaveBeenCalledWith([
            { container, changed: true },
        ]);
        expect(container.image.digest.watch).toBe(false);
    });
    test.each(['', 'Bearer wrong'])(
        'rejects invalid authentication %s',
        async (token) => {
            expect((await send(app, payload, token)).status).toBe(401);
            expect(watcher.getContainers).not.toHaveBeenCalled();
        },
    );
    test.each(['disabled', 'unknown'])(
        'hides disabled or unknown receiver %s',
        async (name) => {
            expect(
                (
                    await request(app)
                        .post(`/events/registry/gitlab/${name}`)
                        .send(payload)
                ).status,
            ).toBe(404);
        },
    );
    test('rejects malformed envelopes and relevant push fields', async () => {
        expect(
            (await send(app, { events: 'bad' } as unknown as typeof payload))
                .status,
        ).toBe(400);
        expect(
            (
                await send(app, {
                    events: [
                        {
                            action: 'push',
                            target: { ...target, digest: 'bad' },
                        },
                    ],
                })
            ).status,
        ).toBe(400);
    });
    test('refreshes current watch selection instead of trusting stale stored labels', async () => {
        watcher.getContainers.mockResolvedValue([]);
        await send(app);
        await settle();
        expect(watcher.processWatchContainers).toHaveBeenCalledWith([]);
    });
    test('deduplicates completed and concurrent identical events', async () => {
        await Promise.all([send(app), send(app)]);
        await settle();
        await send(app);
        await settle();
        expect(watcher.processWatchContainers).toHaveBeenCalledTimes(1);
    });
    test('expires successful dedup entries', async () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        try {
            await send(app);
            await settle();
            now.mockReturnValue(61001);
            await send(app);
            await settle();
            expect(watcher.processWatchContainers).toHaveBeenCalledTimes(2);
        } finally {
            now.mockRestore();
        }
    });
    test('bounds the pending queue without rejecting repeated entries within one envelope', async () => {
        let release: (containers: Container[]) => void;
        watcher.getContainers.mockReturnValue(
            new Promise<Container[]>((resolve) => {
                release = resolve;
            }),
        );
        for (let batch = 0; batch < 10; batch++) {
            const events = Array.from({ length: 100 }, (_, index) => ({
                action: 'push',
                target: {
                    ...target,
                    digest: `sha256:${(batch * 100 + index).toString(16).padStart(64, '0')}`,
                },
            }));
            expect((await send(app, { events })).status).toBe(202);
        }
        expect((await send(app)).status).toBe(429);
        release([]);
        await settle();
    });
    test('queues different digest events and permits retry after check errors', async () => {
        watcher.processWatchContainers.mockResolvedValueOnce([
            { container: { ...container, error: { message: 'offline' } } },
        ]);
        await send(app);
        await settle();
        await send(app);
        await settle();
        await send(app, {
            events: [
                {
                    action: 'push',
                    target: { ...target, digest: `sha256:${'b'.repeat(64)}` },
                },
            ],
        });
        await settle();
        expect(watcher.processWatchContainers).toHaveBeenCalledTimes(3);
    });
    test('unknown images are not cached so subsequent discovery can retry', async () => {
        jest.mocked(store.getContainers).mockReturnValueOnce([]);
        await send(app);
        await settle();
        await send(app);
        await settle();
        expect(watcher.processWatchContainers).toHaveBeenCalledTimes(1);
    });
    test('honors configured host restriction', async () => {
        app = express();
        app.use(
            init({
                local: {
                    enabled: true,
                    token: 'secret',
                    registry: 'other.example.com',
                },
            }),
        );
        await request(app)
            .post('/gitlab/local')
            .set('Authorization', 'Bearer secret')
            .send(payload);
        await settle();
        expect(watcher.getContainers).not.toHaveBeenCalled();
    });
    test('only exact repository, tag and host including port match', () => {
        const hint = parseHints(payload)[0];
        expect(matches(container, hint)).toBe(true);
        for (const difference of [
            { host: 'registry.example.com:5000' },
            { repository: 'apps/other' },
            { tag: 'Latest' },
        ])
            expect(matches(container, { ...hint, ...difference })).toBe(false);
        expect(
            matches(
                {
                    ...container,
                    image: {
                        ...container.image,
                        registry: { name: 'x', url: 'bad' },
                    },
                },
                hint,
            ),
        ).toBe(false);
    });
    test('ignores deletes, blobs and untagged manifests', () => {
        expect(
            parseHints({
                events: [
                    { action: 'delete', target },
                    {
                        action: 'push',
                        target: {
                            ...target,
                            mediaType: 'application/octet-stream',
                        },
                    },
                    { action: 'push', target: { ...target, tag: undefined } },
                ],
            }),
        ).toEqual([]);
    });
    test.each(['apps/my--container', 'apps/my__container'])(
        'accepts valid registry repository separators in %s',
        (repository) => {
            expect(
                parseHints({
                    events: [
                        { action: 'push', target: { ...target, repository } },
                    ],
                })[0].repository,
            ).toBe(repository);
        },
    );
    test('supports request host fallback and rejects credentials in target URLs', () => {
        expect(
            parseHints({
                events: [
                    {
                        action: 'push',
                        target: { ...target, url: undefined },
                        request: { host: 'REGISTRY.EXAMPLE.COM:5000' },
                    },
                ],
            })[0].host,
        ).toBe('registry.example.com:5000');
        expect(() =>
            parseHints({
                events: [
                    {
                        action: 'push',
                        target: {
                            ...target,
                            url: 'https://user:pass@registry.example.com/v2',
                        },
                    },
                ],
            }),
        ).toThrow();
    });
    test('validates receiver settings and mandatory enabled secrets', () => {
        configuration.wudEnvVars['WUD_EVENT_GITLAB_LOCAL_ENABLED'] = 'true';
        expect(() => getConfigurations()).toThrow();
        configuration.wudEnvVars['WUD_EVENT_GITLAB_LOCAL_TOKEN'] = 'secret';
        expect(getConfigurations().local).toEqual({
            enabled: true,
            token: 'secret',
        });
        delete configuration.wudEnvVars['WUD_EVENT_GITLAB_LOCAL_ENABLED'];
        delete configuration.wudEnvVars['WUD_EVENT_GITLAB_LOCAL_TOKEN'];
    });
    test.each(['simple', 'batch'])(
        'preserves explicit trigger opt-in and exclusions in %s mode',
        async (mode) => {
            const trigger = new Trigger();
            trigger.type = 'dockercompose';
            trigger.name = 'local';
            trigger.configuration = {
                includebydefault: false,
                threshold: 'all',
                once: true,
                mode,
                auto: true,
            };
            const single = jest
                .spyOn(trigger, 'trigger')
                .mockResolvedValue(undefined);
            const batch = jest
                .spyOn(trigger, 'triggerBatch')
                .mockResolvedValue(undefined);
            const eligible = {
                ...container,
                updateAvailable: true,
                updateKind: { kind: 'digest' as const },
                triggerInclude: 'dockercompose.local',
            };
            const blocked = {
                ...eligible,
                id: 'blocked',
                triggerExclude: 'dockercompose.local',
            };
            const noOptIn = {
                ...eligible,
                id: 'no-opt-in',
                triggerInclude: undefined,
            };
            const reports = [eligible, blocked, noOptIn].map((container) => ({
                container,
                changed: true,
            }));
            watcher.processWatchContainers.mockImplementation(async () => {
                if (mode === 'simple')
                    for (const report of reports)
                        await trigger.handleContainerReport(report);
                return reports;
            });
            jest.mocked(event.emitContainerReports).mockImplementation(
                (reports) => {
                    if (mode === 'batch')
                        void trigger.handleContainerReports(reports);
                },
            );
            await send(app);
            await settle();
            if (mode === 'simple')
                expect(single).toHaveBeenCalledWith(eligible);
            else expect(batch).toHaveBeenCalledWith([eligible]);
            expect(mode === 'simple' ? single : batch).toHaveBeenCalledTimes(1);
        },
    );
});
