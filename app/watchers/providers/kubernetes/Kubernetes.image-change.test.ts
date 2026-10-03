// @ts-nocheck
// Regression: a workload whose image changes must not be served from the
// store cache with its old tag/digest. Only infra is mocked (K8s API, cron,
// events, store, registry); tag/image parsing and watcher logic are real.

jest.mock('@kubernetes/client-node', () => ({
    KubeConfig: jest.fn(),
    AppsV1Api: jest.fn(),
    CoreV1Api: jest.fn(),
    BatchV1Api: jest.fn(),
}));
jest.mock('node-cron', () => ({
    schedule: jest.fn(() => ({ stop: jest.fn() })),
}));
jest.mock('../../../event');
jest.mock('../../../prometheus/watcher', () => ({
    getWatchContainerGauge: () => undefined,
}));

const mockDb = new Map();
jest.mock('../../../store/container', () => {
    const save = (container) => {
        mockDb.set(container.id, JSON.parse(JSON.stringify(container)));
        return container;
    };
    return {
        getContainer: (id) => {
            const container = mockDb.get(id);
            return container
                ? { ...container, resultChanged: () => false }
                : undefined;
        },
        getContainers: () => [...mockDb.values()],
        insertContainer: save,
        updateContainer: save,
        deleteContainer: (id) => mockDb.delete(id),
    };
});

const mockHub = {
    getId: () => 'hub.public',
    match: () => true,
    normalizeImage: (image) => image,
    shouldWatchDigest: () => false,
    getTags: async () => ['26.0', '26.1', '26.2'],
    getImageManifestDigest: async () => ({
        digest: 'sha256:remote',
        version: 2,
    }),
};
jest.mock('../../../registry', () => ({
    getState: () => ({ registry: { 'hub.public': mockHub }, trigger: {} }),
}));

import { Kubernetes } from './Kubernetes';
import { KubeConfig, AppsV1Api, CoreV1Api } from '@kubernetes/client-node';

const ID = 'metabase_deployment_cloudbeaver_cloudbeaver';
let image;
let imageID;

const deployment = () => ({
    metadata: { name: 'cloudbeaver', namespace: 'metabase', annotations: {} },
    spec: {
        selector: { matchLabels: { app: 'cloudbeaver' } },
        template: { spec: { containers: [{ name: 'cloudbeaver', image }] } },
    },
});

beforeAll(() => {
    const apps = {
        listDeploymentForAllNamespaces: async () => ({ items: [deployment()] }),
    };
    const core = {
        listNode: async () => ({
            items: [{ status: { nodeInfo: { architecture: 'amd64' } } }],
        }),
        listNamespacedPod: async () => ({
            items: [
                {
                    status: {
                        phase: 'Running',
                        containerStatuses: [{ name: 'cloudbeaver', imageID }],
                    },
                },
            ],
        }),
    };
    KubeConfig.mockImplementation(() => ({
        loadFromCluster: jest.fn(),
        makeApiClient: (Api) =>
            Api === AppsV1Api ? apps : Api === CoreV1Api ? core : {},
    }));
});

const newWatcher = async () => {
    const k8s = new Kubernetes();
    await k8s.register('watcher', 'kubernetes', 'test', {
        workloadtypes: ['Deployment'],
        watchatstart: false,
    });
    return k8s;
};

describe('Kubernetes watcher - workload image change', () => {
    beforeEach(() => {
        mockDb.clear();
        image = 'cloudbeaver/cloudbeaver:26.1';
        imageID = 'docker.io/cloudbeaver/cloudbeaver@sha256:old';
    });

    test('picks up a new tag after the workload is updated', async () => {
        const k8s = await newWatcher();

        let [report] = await k8s.watch();
        expect(report.container.image.tag.value).toBe('26.1');
        expect(report.container.updateAvailable).toBe(true);

        image = 'cloudbeaver/cloudbeaver:26.2';
        imageID = 'docker.io/cloudbeaver/cloudbeaver@sha256:new';

        [report] = await k8s.watch();
        expect(report.container.id).toBe(ID);
        expect(report.container.image.tag.value).toBe('26.2');
        expect(report.container.updateAvailable).toBe(false);
    });

    test('picks up a new tag sharing the digest of the old one', async () => {
        const k8s = await newWatcher();
        await k8s.watch();

        // e.g. 26.1 -> 26.2 while both tags still point to the same image
        image = 'cloudbeaver/cloudbeaver:26.2';
        const [report] = await k8s.watch();
        expect(report.container.image.tag.value).toBe('26.2');
        expect(report.container.updateAvailable).toBe(false);
    });

    test('picks up a digest-only change (same tag, new image)', async () => {
        const k8s = await newWatcher();
        await k8s.watch();

        imageID = 'docker.io/cloudbeaver/cloudbeaver@sha256:repulled';
        const [report] = await k8s.watch();
        expect(report.container.image.id).toBe(imageID);
        expect(report.container.image.digest.value).toBe('sha256:repulled');
    });

    test('preserves snooze state when the image changes', async () => {
        const k8s = await newWatcher();
        await k8s.watch();
        const snoozedUntil = Date.UTC(2099, 0, 1);
        mockDb.set(ID, {
            ...mockDb.get(ID),
            snoozedVersion: '26.2',
            snoozedUntil,
        });

        image = 'cloudbeaver/cloudbeaver:26.2';
        imageID = 'docker.io/cloudbeaver/cloudbeaver@sha256:new';
        const [report] = await k8s.watch();
        expect(report.container.image.tag.value).toBe('26.2');
        expect(report.container.snoozedVersion).toBe('26.2');
        expect(report.container.snoozedUntil).toBe(snoozedUntil);
    });

    test('keeps using the store entry when the image is unchanged', async () => {
        const k8s = await newWatcher();
        await k8s.watch();
        const spy = jest.spyOn(k8s, 'normalizeContainer');

        await k8s.watch();
        expect(spy).not.toHaveBeenCalled();
    });
});
