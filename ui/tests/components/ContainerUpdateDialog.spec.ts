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
      id: 'webhook.hook1',
      type: 'webhook',
      name: 'hook1',
      configuration: { threshold: 'minor' },
    },
    {
      id: 'docker.local',
      type: 'docker',
      name: 'local',
      configuration: {},
    },
    {
      id: 'mqtt.main',
      type: 'mqtt',
      name: 'main',
      configuration: {},
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

  it('loads triggers and pre-selects docker trigger when present', async () => {
    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(containerService.getContainerTriggers).toHaveBeenCalledWith('c-123456');
    expect((wrapper.vm as any).selectedTriggerKey).toBe('docker.local');
    expect((wrapper.vm as any).selectedTrigger).toEqual(mockTriggers[1]);
  });

  it('pre-selects dockercompose trigger when docker is not present', async () => {
    const composeTriggers = [
      { id: 'webhook.hook1', type: 'webhook', name: 'hook1' },
      { id: 'dockercompose.main', type: 'dockercompose', name: 'main' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(composeTriggers);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).selectedTriggerKey).toBe('dockercompose.main');
    expect((wrapper.vm as any).selectedTrigger).toEqual(composeTriggers[1]);
  });

  it('pre-selects first trigger when neither docker nor dockercompose is present', async () => {
    const otherTriggers = [
      { id: 'webhook.hook1', type: 'webhook', name: 'hook1' },
      { id: 'mqtt.main', type: 'mqtt', name: 'main' },
    ];
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce(otherTriggers);

    const wrapper = mount(ContainerUpdateDialog, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).selectedTriggerKey).toBe('webhook.hook1');
    expect((wrapper.vm as any).selectedTrigger).toEqual(otherTriggers[0]);
  });

  it('handles empty triggers gracefully', async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValueOnce([]);

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
    expect(wrapper.text()).toContain('No triggers available for this container.');
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

  it('runs trigger on confirm and emits success notification', async () => {
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
    expect(wrapper.emitted('updated')![0]).toEqual([mockTriggers[1]]);
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
