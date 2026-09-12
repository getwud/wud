// @ts-nocheck
// ─── Mock all dependencies ────────────────────────────────────────────────────

jest.mock('@kubernetes/client-node', () => ({
    KubeConfig: jest.fn(),
    AppsV1Api: jest.fn(),
    CoreV1Api: jest.fn(),
    BatchV1Api: jest.fn(),
}));
jest.mock('node-cron');
jest.mock('../../../event');
jest.mock('../../../store/container');
jest.mock('../../../registry');
jest.mock('../../../model/container');
jest.mock('../../../tag');
jest.mock('../../../prometheus/watcher');
jest.mock('parse-docker-image-name');

import {
    Kubernetes,
    isWorkloadToWatch,
    extractDigestFromImageID,
    buildContainerId,
} from './Kubernetes';
import * as event from '../../../event';
import * as storeContainer from '../../../store/container';
import * as registry from '../../../registry';
import {
    validate as validateContainer,
    fullName,
} from '../../../model/container';

import {
    KubeConfig,
    AppsV1Api,
    CoreV1Api,
    BatchV1Api,
} from '@kubernetes/client-node';
import mockCron from 'node-cron';
import mockParse from 'parse-docker-image-name';
import * as mockTag from '../../../tag';
import * as mockPrometheus from '../../../prometheus/watcher';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const makeDeployment = (overrides: any = {}) => ({
    metadata: {
        name: 'my-deployment',
        namespace: 'default',
        annotations: {},
        ...overrides.metadata,
    },
    spec: {
        selector: { matchLabels: { app: 'my-deployment' } },
        template: {
            spec: {
                containers: [{ name: 'nginx', image: 'nginx:1.27' }],
            },
        },
        ...(overrides.spec ?? {}),
    },
    status: {},
    ...overrides,
});

const makePod = (
    imageID: string = 'docker-pullable://nginx@sha256:abc123',
    containerName: string = 'nginx',
) => ({
    status: {
        phase: 'Running',
        containerStatuses: [{ name: containerName, imageID }],
    },
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Kubernetes Watcher', () => {
    let kubernetes: Kubernetes;
    let mockAppsV1Api: any;
    let mockCoreV1Api: any;
    let mockBatchV1Api: any;
    let mockSchedule: any;
    let mockKubeConfigInstance: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Setup cron mock
        mockSchedule = { stop: jest.fn() };
        mockCron.schedule.mockReturnValue(mockSchedule);

        // Setup K8s API mocks
        mockAppsV1Api = {
            listNamespacedDeployment: jest.fn(),
            listDeploymentForAllNamespaces: jest.fn(),
            listNamespacedStatefulSet: jest.fn(),
            listStatefulSetForAllNamespaces: jest.fn(),
            listNamespacedDaemonSet: jest.fn(),
            listDaemonSetForAllNamespaces: jest.fn(),
        };
        mockCoreV1Api = {
            listNode: jest.fn(),
            listNamespacedPod: jest.fn(),
        };
        mockBatchV1Api = {
            listNamespacedCronJob: jest.fn(),
            listCronJobForAllNamespaces: jest.fn(),
        };

        mockKubeConfigInstance = {
            loadFromCluster: jest.fn(),
            loadFromFile: jest.fn(),
            makeApiClient: jest.fn().mockImplementation((ApiClass) => {
                if (ApiClass === AppsV1Api) return mockAppsV1Api;
                if (ApiClass === CoreV1Api) return mockCoreV1Api;
                if (ApiClass === BatchV1Api) return mockBatchV1Api;
            }),
        };
        KubeConfig.mockImplementation(() => mockKubeConfigInstance);

        // Setup store mocks
        storeContainer.getContainers.mockReturnValue([]);
        storeContainer.getContainer.mockReturnValue(undefined);
        storeContainer.insertContainer.mockImplementation((c) => c);
        storeContainer.updateContainer.mockImplementation((c) => c);
        storeContainer.deleteContainer.mockImplementation(() => {});

        // Setup registry mocks
        registry.getState.mockReturnValue({ registry: {} });

        // Setup event mocks
        event.emitWatcherStart.mockImplementation(() => {});
        event.emitWatcherStop.mockImplementation(() => {});
        event.emitContainerReport.mockImplementation(() => {});
        event.emitContainerReports.mockImplementation(() => {});

        // Setup tag mocks
        mockTag.parse.mockReturnValue({ major: 1, minor: 27, patch: 0 });
        mockTag.isGreater.mockReturnValue(false);
        mockTag.transform.mockImplementation((_, tag) => tag);

        // Setup prometheus mock
        const mockGauge = { set: jest.fn() };
        mockPrometheus.getWatchContainerGauge.mockReturnValue(mockGauge);

        // Setup model container mock
        fullName.mockReturnValue('test_container');
        validateContainer.mockImplementation((c) => c);

        // Setup default empty responses for APIs
        mockAppsV1Api.listNamespacedDeployment.mockResolvedValue({ items: [] });
        mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
            items: [],
        });
        mockAppsV1Api.listNamespacedStatefulSet.mockResolvedValue({
            items: [],
        });
        mockAppsV1Api.listStatefulSetForAllNamespaces.mockResolvedValue({
            items: [],
        });
        mockAppsV1Api.listNamespacedDaemonSet.mockResolvedValue({ items: [] });
        mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
            items: [],
        });
        mockBatchV1Api.listNamespacedCronJob.mockResolvedValue({ items: [] });
        mockBatchV1Api.listCronJobForAllNamespaces.mockResolvedValue({
            items: [],
        });

        // Setup parse mock
        mockParse.mockReturnValue({
            domain: 'docker.io',
            path: 'library/nginx',
            tag: '1.27',
        });

        // Setup node list mock (default: amd64 node)
        mockCoreV1Api.listNode.mockResolvedValue({
            items: [
                { metadata: { labels: { 'kubernetes.io/arch': 'amd64' } } },
            ],
        });

        // Setup pod list mock (default: one running pod)
        mockCoreV1Api.listNamespacedPod.mockResolvedValue({
            items: [makePod()],
        });

        kubernetes = new Kubernetes();
    });

    // ─── Pure functions ───────────────────────────────────────────────────────

    describe('isWorkloadToWatch()', () => {
        test('returns true when annotation is "true"', () => {
            expect(isWorkloadToWatch('true', false)).toBe(true);
        });

        test('returns false when annotation is "false"', () => {
            expect(isWorkloadToWatch('false', true)).toBe(false);
        });

        test('uses watchByDefault when annotation is undefined', () => {
            expect(isWorkloadToWatch(undefined, true)).toBe(true);
            expect(isWorkloadToWatch(undefined, false)).toBe(false);
        });

        test('uses watchByDefault when annotation is empty string', () => {
            expect(isWorkloadToWatch('', true)).toBe(true);
        });

        test('is case insensitive', () => {
            expect(isWorkloadToWatch('TRUE', false)).toBe(true);
            expect(isWorkloadToWatch('False', true)).toBe(false);
        });
    });

    describe('extractDigestFromImageID()', () => {
        test('extracts digest from docker-pullable format', () => {
            expect(
                extractDigestFromImageID(
                    'docker-pullable://docker.io/library/nginx@sha256:abc123',
                ),
            ).toBe('sha256:abc123');
        });

        test('extracts digest from simple format', () => {
            expect(
                extractDigestFromImageID(
                    'docker.io/library/nginx@sha256:abc123',
                ),
            ).toBe('sha256:abc123');
        });

        test('returns undefined when no @ separator', () => {
            expect(
                extractDigestFromImageID('docker.io/library/nginx:1.27'),
            ).toBeUndefined();
        });

        test('returns undefined when imageID is undefined', () => {
            expect(extractDigestFromImageID(undefined)).toBeUndefined();
        });

        test('returns undefined when digest part does not start with sha256:', () => {
            expect(
                extractDigestFromImageID('image@notadigest'),
            ).toBeUndefined();
        });
    });

    describe('buildContainerId()', () => {
        test('builds correct id', () => {
            expect(
                buildContainerId('default', 'Deployment', 'my-app', 'nginx'),
            ).toBe('default_deployment_my-app_nginx');
        });

        test('lowercases kind', () => {
            expect(
                buildContainerId('prod', 'StatefulSet', 'db', 'postgres'),
            ).toBe('prod_statefulset_db_postgres');
        });
    });

    // ─── Configuration ────────────────────────────────────────────────────────

    describe('Configuration', () => {
        test('creates instance', () => {
            expect(kubernetes).toBeDefined();
            expect(kubernetes).toBeInstanceOf(Kubernetes);
        });

        test('has configuration schema', () => {
            const schema = kubernetes.getConfigurationSchema();
            expect(schema).toBeDefined();
        });

        test('validates default configuration', () => {
            expect(() => kubernetes.validateConfiguration({})).not.toThrow();
        });

        test('validates configuration with namespace', () => {
            expect(() =>
                kubernetes.validateConfiguration({ namespace: 'production' }),
            ).not.toThrow();
        });

        test('validates configuration with custom cron', () => {
            expect(() =>
                kubernetes.validateConfiguration({ cron: '*/5 * * * *' }),
            ).not.toThrow();
        });

        test('validates configuration with kubeconfig path', () => {
            expect(() =>
                kubernetes.validateConfiguration({
                    kubeconfig: '/home/user/.kube/config',
                }),
            ).not.toThrow();
        });

        test('rejects invalid cron', () => {
            expect(() =>
                kubernetes.validateConfiguration({ cron: 'not-a-cron' }),
            ).toThrow();
        });
    });

    // ─── Initialization ───────────────────────────────────────────────────────

    describe('Initialization', () => {
        test('inits with in-cluster config by default', async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
            expect(mockKubeConfigInstance.loadFromCluster).toHaveBeenCalled();
            expect(mockKubeConfigInstance.loadFromFile).not.toHaveBeenCalled();
        });

        test('inits from kubeconfig file when specified', async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                kubeconfig: '/home/user/.kube/config',
            });
            expect(mockKubeConfigInstance.loadFromFile).toHaveBeenCalledWith(
                '/home/user/.kube/config',
            );
        });

        test('schedules cron job on init', async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                cron: '*/30 * * * *',
            });
            expect(mockCron.schedule).toHaveBeenCalledWith(
                '*/30 * * * *',
                expect.any(Function),
                { maxRandomDelay: 60000 },
            );
        });

        test('disables watchatstart when store has containers', async () => {
            storeContainer.getContainers.mockReturnValue([{ id: 'existing' }]);
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                watchatstart: true,
            });
            expect(kubernetes.configuration.watchatstart).toBe(false);
        });
    });

    // ─── Deregistration ───────────────────────────────────────────────────────

    describe('Deregistration', () => {
        test('stops cron on deregister', async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
            await kubernetes.deregisterComponent();
            expect(mockSchedule.stop).toHaveBeenCalled();
        });
    });

    // ─── listWorkloads ────────────────────────────────────────────────────────

    describe('listWorkloads()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
        });

        test('lists deployments from all namespaces when namespace is empty', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [makeDeployment()],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(
                mockAppsV1Api.listDeploymentForAllNamespaces,
            ).toHaveBeenCalled();
            expect(workloads).toHaveLength(1);
            expect(workloads[0].kind).toBe('Deployment');
        });

        test('lists deployments from specific namespace', async () => {
            kubernetes.configuration.namespace = 'production';
            mockAppsV1Api.listNamespacedDeployment.mockResolvedValue({
                items: [makeDeployment()],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(mockAppsV1Api.listNamespacedDeployment).toHaveBeenCalledWith(
                {
                    namespace: 'production',
                },
            );
            expect(workloads).toHaveLength(1);
        });

        test('extracts container spec from deployment', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [makeDeployment()],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads[0].containers).toHaveLength(1);
            expect(workloads[0].containers[0].name).toBe('nginx');
            expect(workloads[0].containers[0].image).toBe('nginx:1.27');
        });

        test('extracts imageID from running pod', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [makeDeployment()],
            });
            mockCoreV1Api.listNamespacedPod.mockResolvedValue({
                items: [
                    makePod(
                        'docker-pullable://docker.io/library/nginx@sha256:abc123',
                    ),
                ],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads[0].containers[0].imageID).toBe(
                'docker-pullable://docker.io/library/nginx@sha256:abc123',
            );
        });

        test('handles missing imageID gracefully when no running pod', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [makeDeployment()],
            });
            mockCoreV1Api.listNamespacedPod.mockResolvedValue({ items: [] });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads[0].containers[0].imageID).toBeUndefined();
        });

        test('handles pod listing error gracefully', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [makeDeployment()],
            });
            mockCoreV1Api.listNamespacedPod.mockRejectedValue(
                new Error('Forbidden'),
            );
            const workloads = await kubernetes.listWorkloads();
            expect(workloads[0].containers[0].imageID).toBeUndefined();
        });

        test('returns empty array when no deployments exist', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads).toHaveLength(0);
        });

        test('skips deployment with missing pod spec', async () => {
            const badDeployment = {
                metadata: {
                    name: 'bad',
                    namespace: 'default',
                    annotations: {},
                },
                spec: {
                    selector: { matchLabels: {} },
                    template: { spec: null },
                },
                status: {},
            };
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [badDeployment],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads).toHaveLength(0);
        });
    });

    // ─── getContainers ────────────────────────────────────────────────────────

    describe('getContainers()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                watchbydefault: true,
                workloadtypes: ['Deployment'],
            });
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [makeDeployment()],
            });
        });

        test('returns containers for watched deployments', async () => {
            const containers = await kubernetes.getContainers();
            expect(containers).toHaveLength(1);
        });

        test('filters out deployments with wud.getwud.io/watch=false', async () => {
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [
                    makeDeployment({
                        metadata: {
                            name: 'no-watch',
                            namespace: 'default',
                            annotations: { 'wud.getwud.io/watch': 'false' },
                        },
                    }),
                ],
            });
            const containers = await kubernetes.getContainers();
            expect(containers).toHaveLength(0);
        });

        test('respects watchbydefault=false', async () => {
            kubernetes.configuration.watchbydefault = false;
            const containers = await kubernetes.getContainers();
            expect(containers).toHaveLength(0);
        });

        test('includes deployment when watchbydefault=false but annotation=true', async () => {
            kubernetes.configuration.watchbydefault = false;
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [
                    makeDeployment({
                        metadata: {
                            name: 'opted-in',
                            namespace: 'default',
                            annotations: { 'wud.getwud.io/watch': 'true' },
                        },
                    }),
                ],
            });
            const containers = await kubernetes.getContainers();
            expect(containers).toHaveLength(1);
        });

        test('prunes containers no longer in the cluster', async () => {
            storeContainer.getContainers.mockReturnValue([
                {
                    id: 'default_deployment_old-deploy_nginx',
                    watcher: 'test',
                },
            ]);
            await kubernetes.getContainers();
            expect(storeContainer.deleteContainer).toHaveBeenCalledWith(
                'default_deployment_old-deploy_nginx',
            );
        });

        test('handles multi-container pods and container-specific annotations', async () => {
            const multiDeployment = makeDeployment({
                metadata: {
                    name: 'web-app',
                    namespace: 'default',
                    annotations: {
                        'wud.getwud.io/display.name': 'Default Name',
                        'wud.getwud.io/display.name.sidecar':
                            'My Custom Sidecar',
                        'wud.getwud.io/tag.include.nginx': '^1\\.27',
                    },
                },
                spec: {
                    selector: { matchLabels: { app: 'web-app' } },
                    template: {
                        spec: {
                            containers: [
                                { name: 'nginx', image: 'nginx:1.27' },
                                { name: 'sidecar', image: 'busybox:latest' },
                            ],
                        },
                    },
                },
            });
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [multiDeployment],
            });
            const containers = await kubernetes.getContainers();
            expect(containers).toHaveLength(2);
            const nginxContainer = containers.find((c) =>
                c.name.endsWith('_nginx'),
            );
            const sidecarContainer = containers.find((c) =>
                c.name.endsWith('_sidecar'),
            );
            expect(nginxContainer.includeTags).toBe('^1\\.27');
            expect(sidecarContainer.displayName).toBe('My Custom Sidecar');
        });
    });

    // ─── Architecture detection ───────────────────────────────────────────────

    describe('getClusterArchitecture()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
        });

        test('returns node architecture from label', async () => {
            mockCoreV1Api.listNode.mockResolvedValue({
                items: [
                    { metadata: { labels: { 'kubernetes.io/arch': 'arm64' } } },
                ],
            });
            const arch = await kubernetes.getClusterArchitecture();
            expect(arch).toBe('arm64');
        });

        test('returns amd64 when no nodes exist', async () => {
            mockCoreV1Api.listNode.mockResolvedValue({ items: [] });
            const arch = await kubernetes.getClusterArchitecture();
            expect(arch).toBe('amd64');
        });

        test('returns amd64 when listNode throws', async () => {
            mockCoreV1Api.listNode.mockRejectedValue(new Error('Forbidden'));
            const arch = await kubernetes.getClusterArchitecture();
            expect(arch).toBe('amd64');
        });
    });

    // ─── watch() ─────────────────────────────────────────────────────────────

    describe('watch()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                workloadtypes: ['Deployment'],
            });
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [],
            });
        });

        test('emits watcher start and stop events', async () => {
            await kubernetes.watch();
            expect(event.emitWatcherStart).toHaveBeenCalled();
            expect(event.emitWatcherStop).toHaveBeenCalled();
        });

        test('returns empty array when no workloads', async () => {
            const result = await kubernetes.watch();
            expect(result).toEqual([]);
        });
    });

    // ─── watchContainer() ─────────────────────────────────────────────────────

    describe('watchContainer()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
        });

        test('emits container report', async () => {
            const mockRegistryProvider = {
                shouldWatchDigest: jest.fn().mockReturnValue(false),
                getTags: jest.fn().mockResolvedValue([]),
            };
            registry.getState.mockReturnValue({
                registry: { 'hub.public': mockRegistryProvider },
            });

            const mockC = {
                id: 'default_deployment_test_nginx',
                name: 'default_deployment_test_nginx',
                watcher: 'test',
                image: {
                    id: 'sha256:abc',
                    registry: {
                        name: 'hub.public',
                        url: 'https://registry-1.docker.io/v2',
                    },
                    name: 'library/nginx',
                    tag: { value: '1.27', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: { tag: '1.27' },
                updateAvailable: false,
                updateKind: { kind: 'unknown' },
            };

            storeContainer.getContainer.mockReturnValue(undefined);
            storeContainer.insertContainer.mockReturnValue(mockC);

            await kubernetes.watchContainer(mockC as any);
            expect(event.emitContainerReport).toHaveBeenCalled();
        });

        test('handles error and attaches it to container', async () => {
            registry.getState.mockReturnValue({ registry: {} });
            storeContainer.getContainer.mockReturnValue(undefined);

            const mockC = {
                id: 'default_deployment_test_nginx',
                name: 'default_deployment_test_nginx',
                watcher: 'test',
                image: {
                    registry: { name: 'unknown' },
                    tag: { value: '1.27', semver: false },
                    digest: { watch: false },
                },
            };
            storeContainer.insertContainer.mockReturnValue(mockC);

            const report = await kubernetes.watchContainer(mockC as any);
            expect(report.container.error).toBeDefined();
        });
    });

    // ─── watchFromCron() ──────────────────────────────────────────────────────

    describe('watchFromCron()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
        });

        test('logs and executes watch', async () => {
            const spyWatch = jest
                .spyOn(kubernetes, 'watch')
                .mockResolvedValue([]);
            const result = await kubernetes.watchFromCron();
            expect(spyWatch).toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    // ─── mapContainerToContainerReport() ──────────────────────────────────────

    describe('mapContainerToContainerReport()', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {});
        });

        test('inserts new container and sets changed=true', () => {
            storeContainer.getContainer.mockReturnValue(undefined);
            const mockC = { id: 'test', updateAvailable: true } as any;
            storeContainer.insertContainer.mockReturnValue(mockC);
            const report = kubernetes.mapContainerToContainerReport(mockC);
            expect(report.changed).toBe(true);
            expect(storeContainer.insertContainer).toHaveBeenCalled();
        });

        test('updates existing container without marking changed when no update', () => {
            const existing = {
                id: 'test',
                updateAvailable: false,
                resultChanged: jest.fn().mockReturnValue(false),
            } as any;
            storeContainer.getContainer.mockReturnValue(existing);
            const updated = { id: 'test', updateAvailable: false } as any;
            storeContainer.updateContainer.mockReturnValue(updated);
            const report = kubernetes.mapContainerToContainerReport(updated);
            expect(storeContainer.updateContainer).toHaveBeenCalled();
            expect(report.changed).toBe(false);
        });
    });

    // ─── Workload Types Tests ───────────────────────────────────────────────────

    describe('StatefulSets', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                workloadtypes: ['StatefulSet'],
            });
        });

        test('lists StatefulSets from all namespaces', async () => {
            mockAppsV1Api.listStatefulSetForAllNamespaces.mockResolvedValue({
                items: [
                    {
                        metadata: {
                            name: 'my-db',
                            namespace: 'default',
                            annotations: {},
                        },
                        spec: {
                            selector: { matchLabels: { app: 'my-db' } },
                            template: {
                                spec: {
                                    containers: [
                                        {
                                            name: 'postgres',
                                            image: 'postgres:16',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads).toHaveLength(1);
            expect(workloads[0].kind).toBe('StatefulSet');
        });

        test('lists StatefulSets in specific namespace', async () => {
            kubernetes.configuration.namespace = 'db-ns';
            mockAppsV1Api.listNamespacedStatefulSet.mockResolvedValue({
                items: [
                    {
                        metadata: {
                            name: 'my-db',
                            namespace: 'db-ns',
                            annotations: {},
                        },
                        spec: {
                            selector: { matchLabels: { app: 'my-db' } },
                            template: {
                                spec: {
                                    containers: [
                                        {
                                            name: 'postgres',
                                            image: 'postgres:16',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(
                mockAppsV1Api.listNamespacedStatefulSet,
            ).toHaveBeenCalledWith({
                namespace: 'db-ns',
            });
            expect(workloads).toHaveLength(1);
        });
    });

    describe('DaemonSets', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                workloadtypes: ['DaemonSet'],
            });
        });

        test('lists DaemonSets', async () => {
            mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
                items: [
                    {
                        metadata: {
                            name: 'fluentd',
                            namespace: 'kube-system',
                            annotations: {},
                        },
                        spec: {
                            template: {
                                spec: {
                                    containers: [
                                        {
                                            name: 'fluentd',
                                            image: 'fluentd:v1.17',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads[0].kind).toBe('DaemonSet');
            expect(workloads[0].containers[0].imageID).toBeUndefined();
        });

        test('lists DaemonSets in specific namespace', async () => {
            kubernetes.configuration.namespace = 'kube-system';
            mockAppsV1Api.listNamespacedDaemonSet.mockResolvedValue({
                items: [],
            });
            await kubernetes.listWorkloads();
            expect(mockAppsV1Api.listNamespacedDaemonSet).toHaveBeenCalledWith({
                namespace: 'kube-system',
            });
        });
    });

    describe('CronJobs', () => {
        beforeEach(async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                workloadtypes: ['CronJob'],
            });
        });

        test('lists CronJobs', async () => {
            mockBatchV1Api.listCronJobForAllNamespaces.mockResolvedValue({
                items: [
                    {
                        metadata: {
                            name: 'backup',
                            namespace: 'default',
                            annotations: {},
                        },
                        spec: {
                            jobTemplate: {
                                spec: {
                                    template: {
                                        spec: {
                                            containers: [
                                                {
                                                    name: 'backup',
                                                    image: 'bitnami/kubectl:1.30',
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            });
            const workloads = await kubernetes.listWorkloads();
            expect(workloads[0].kind).toBe('CronJob');
            expect(workloads[0].containers[0].imageID).toBeUndefined();
        });

        test('lists CronJobs in specific namespace', async () => {
            kubernetes.configuration.namespace = 'cron-ns';
            mockBatchV1Api.listNamespacedCronJob.mockResolvedValue({
                items: [],
            });
            await kubernetes.listWorkloads();
            expect(mockBatchV1Api.listNamespacedCronJob).toHaveBeenCalledWith({
                namespace: 'cron-ns',
            });
        });
    });

    describe('workloadtypes filtering', () => {
        test('only lists configured workload types', async () => {
            await kubernetes.register('watcher', 'kubernetes', 'test', {
                workloadtypes: ['Deployment'],
            });
            mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
                items: [],
            });

            await kubernetes.listWorkloads();
            expect(
                mockAppsV1Api.listDeploymentForAllNamespaces,
            ).toHaveBeenCalled();
            expect(
                mockAppsV1Api.listStatefulSetForAllNamespaces,
            ).not.toHaveBeenCalled();
            expect(
                mockAppsV1Api.listDaemonSetForAllNamespaces,
            ).not.toHaveBeenCalled();
            expect(
                mockBatchV1Api.listCronJobForAllNamespaces,
            ).not.toHaveBeenCalled();
        });
    });
});
