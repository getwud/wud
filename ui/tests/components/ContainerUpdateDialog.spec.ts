import { mount } from '@vue/test-utils';
import ContainerUpdateDialog from '@/components/ContainerUpdateDialog.vue';
import * as containerService from '@/services/container';

jest.mock('@/services/container', () => ({
  getContainerTriggers: jest.fn(),
  runTrigger: jest.fn(),
}));

describe('ContainerUpdateDialog.vue', () => {
  const mockContainer = {
    id: 'c-123456',
    name: 'nginx-service',
    displayName: 'Nginx Service',
    watcher: 'local',
    image: {
      name: 'nginx:1.24.0',
      path: 'library/nginx',
      registry: { name: 'dockerhub' },
      tag: { value: '1.24.0' },
      created: '2023-01-01T00:00:00Z',
    },
    updateKind: {
      kind: 'tag',
      localValue: '1.24.0',
      remoteValue: '1.25.0',
      semverDiff: 'minor',
    },
    result: {
      tag: '1.25.0',
      created: '2023-05-01T00:00:00Z',
    },
  };

  const mockTriggers = [
    {
      id: 'smtp.admin',
      type: 'smtp',
      name: 'admin',
    },
    {
      id: 'telegram.alerts',
      type: 'telegram',
      name: 'alerts',
    },
    {
      id: 'docker.local',
      type: 'docker',
      name: 'local',
    },
    {
      id: 'dockercompose.main',
      type: 'dockercompose',
      name: 'main',
    },
  ];

  let mockEventBus: { emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = { emit: jest.fn() };
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue(mockTriggers);
    (containerService.runTrigger as jest.Mock).mockResolvedValue({ ok: true });
  });

  it('renders correctly with container info and version transition', async () => {
    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
        newVersion: '1.25.0',
      },
      global: {
        provide: {
          eventBus: mockEventBus,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Update container');
    expect(wrapper.text()).toContain('Nginx Service');
    expect(wrapper.text()).toContain('nginx:1.24.0');
    expect(wrapper.text()).toContain('1.24.0');
    expect(wrapper.text()).toContain('1.25.0');
  });

  it('filters out non-updater triggers (e.g. smtp, telegram)', async () => {
    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(containerService.getContainerTriggers).toHaveBeenCalledWith('c-123456');
    const triggerTypes = (wrapper.vm as any).triggers.map((t: any) => t.type);
    expect(triggerTypes).toEqual(['docker', 'dockercompose']);
    expect(triggerTypes).not.toContain('smtp');
    expect(triggerTypes).not.toContain('telegram');
  });

  it('renders direct single trigger confirmation without v-select when exactly 1 updater is available', async () => {
    const singleUpdater = [
      { id: 'smtp.mail', type: 'smtp', name: 'mail' },
      { id: 'docker.local', type: 'docker', name: 'local' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(singleUpdater);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).triggers).toHaveLength(1);
    expect((wrapper.vm as any).selectedTriggerKey).toBe('docker.local');
    expect((wrapper.vm as any).singleTriggerLabel).toBe('docker (local)');
    expect(wrapper.find('.v-select').exists()).toBe(false);
    expect(wrapper.text()).toContain('Target trigger');
    expect(wrapper.text()).toContain('docker (local)');
  });

  it('renders v-select with intelligent preselection when multiple updaters are available', async () => {
    const multipleUpdaters = [
      { id: 'command.restart', type: 'command', name: 'restart' },
      { id: 'docker.local', type: 'docker', name: 'local' },
      { id: 'nomad.job', type: 'nomad', name: 'job' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(multipleUpdaters);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).triggers).toHaveLength(3);
    expect(wrapper.find('.v-select').exists()).toBe(true);
    expect((wrapper.vm as any).selectedTriggerKey).toBe('docker.local');
    expect((wrapper.vm as any).selectedTrigger).toEqual(multipleUpdaters[1]);
  });

  it('pre-selects dockercompose trigger when docker is not present among multiple updaters', async () => {
    const composeUpdaters = [
      { id: 'command.run', type: 'command', name: 'run' },
      { id: 'dockercompose.prod', type: 'dockercompose', name: 'prod' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(composeUpdaters);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).selectedTriggerKey).toBe('dockercompose.prod');
  });

  it('shows empty state warning and disables update button when no updater trigger is configured', async () => {
    const notifyOnlyTriggers = [
      { id: 'telegram.bot', type: 'telegram', name: 'bot' },
      { id: 'discord.channel', type: 'discord', name: 'channel' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(notifyOnlyTriggers);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).triggers).toHaveLength(0);
    expect((wrapper.vm as any).selectedTriggerKey).toBeNull();
    expect((wrapper.vm as any).selectedTrigger).toBeUndefined();
    expect(wrapper.text()).toContain(
      'No update trigger (docker, dockercompose, command, nomad) is configured for this container.',
    );

    const updateBtn = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Update'));
    expect(updateBtn?.attributes('disabled')).toBeDefined();
  });

  it('handles triggers fetching failure gracefully', async () => {
    (containerService.getContainerTriggers as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).triggers).toHaveLength(0);
    expect((wrapper.vm as any).selectedTriggerKey).toBeNull();
  });

  it('runs trigger on confirm and emits success notification and updated event', async () => {
    const singleUpdater = [
      { id: 'docker.local', type: 'docker', name: 'local' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(singleUpdater);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
      global: {
        provide: {
          eventBus: mockEventBus,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    await (wrapper.vm as any).confirmUpdate();

    expect(containerService.runTrigger).toHaveBeenCalledWith({
      containerId: 'c-123456',
      triggerType: 'docker',
      triggerName: 'local',
    });
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'notify',
      'Update triggered successfully for Nginx Service',
    );
    expect(wrapper.emitted('updated')).toBeTruthy();
    expect(wrapper.emitted('updated')![0]).toEqual([singleUpdater[0]]);
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('handles runTrigger error and emits error notification', async () => {
    (containerService.runTrigger as jest.Mock).mockRejectedValueOnce(new Error('Docker daemon error'));

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
      global: {
        provide: {
          eventBus: mockEventBus,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    await (wrapper.vm as any).confirmUpdate();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'notify',
      'Update triggered with error (Docker daemon error)',
      'error',
    );
    expect((wrapper.vm as any).isUpdating).toBe(false);
  });

  it('emits update:modelValue false on close', () => {
    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    (wrapper.vm as any).close();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('computes digest versions properly when short filter is present', () => {
    const digestContainer = {
      ...mockContainer,
      image: {
        tag: { value: '' },
      },
      updateKind: {
        kind: 'digest',
        localValue: 'sha256:11112222333344445555',
        remoteValue: 'sha256:99998888777766665555',
      },
    };

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: digestContainer,
      },
    });

    expect((wrapper.vm as any).currentVersion).toBe('sha256:11112222...');
    expect((wrapper.vm as any).displayNewVersion).toBe('sha256:99998888...');
  });
});
