import { mount } from '@vue/test-utils';
import TriggerTestDialog from '@/components/TriggerTestDialog.vue';
import * as triggerService from '@/services/trigger';
import * as containerService from '@/services/container';

jest.mock('@/services/trigger', () => ({
  runTrigger: jest.fn(),
}));

jest.mock('@/services/container', () => ({
  getAllContainers: jest.fn(),
}));

describe('TriggerTestDialog.vue', () => {
  const mockTrigger = {
    id: 'slack.myslack',
    type: 'slack',
    name: 'myslack',
  };

  const mockRealContainers = [
    {
      id: 'real-container-1',
      name: 'nginx-prod',
      watcher: 'local',
      stack: 'web',
      labels: {
        'com.docker.compose.service': 'nginx',
      },
      image: {
        tag: {
          value: '1.25.0',
        },
      },
    },
    {
      id: 'real-container-2',
      name: 'redis-cache',
      watcher: 'remote',
      image: {
        tag: {
          value: '7.0.0',
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (containerService.getAllContainers as jest.Mock).mockResolvedValue(mockRealContainers);
  });

  it('renders correctly when opened', () => {
    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    expect(wrapper.text()).toContain('Test Trigger');
    expect(wrapper.text()).toContain('slack / myslack');
    expect(wrapper.html()).toContain('Source Container');
  });

  it('loads containers on mount', async () => {
    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await wrapper.vm.$nextTick();
    expect(containerService.getAllContainers).toHaveBeenCalled();
    expect((wrapper.vm as any).containers).toEqual(mockRealContainers);
  });

  it('emits update:modelValue on close', () => {
    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    (wrapper.vm as any).close();
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('calls runTrigger with enriched mock container when no real container is selected', async () => {
    (triggerService.runTrigger as jest.Mock).mockResolvedValueOnce({ ok: true });

    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await (wrapper.vm as any).executeTrigger();
    expect(triggerService.runTrigger).toHaveBeenCalledWith({
      triggerType: 'slack',
      triggerName: 'myslack',
      container: expect.objectContaining({
        id: '123456789',
        name: 'container_test',
        watcher: 'watcher_test',
        stack: 'test-stack',
        labels: {
          'com.docker.compose.project.working_dir': '/opt/docker/container_test',
          'com.docker.compose.service': 'container_test',
        },
      }),
    });
  });

  it('pre-fills fields and sends cloned container payload with simulation state when real container is selected', async () => {
    (triggerService.runTrigger as jest.Mock).mockResolvedValueOnce({ ok: true });

    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await wrapper.vm.$nextTick();

    // Select real container
    (wrapper.vm as any).selectedContainerId = 'real-container-1';
    await wrapper.vm.$nextTick();

    // Verify fields are pre-filled
    expect((wrapper.vm as any).container.id).toBe('real-container-1');
    expect((wrapper.vm as any).container.name).toBe('nginx-prod');
    expect((wrapper.vm as any).container.watcher).toBe('local');
    expect((wrapper.vm as any).container.updateKind.localValue).toBe('1.25.0');

    // Execute trigger
    await (wrapper.vm as any).executeTrigger();

    expect(triggerService.runTrigger).toHaveBeenCalledWith({
      triggerType: 'slack',
      triggerName: 'myslack',
      container: expect.objectContaining({
        id: 'real-container-1',
        name: 'nginx-prod',
        watcher: 'local',
        stack: 'web',
        labels: {
          'com.docker.compose.service': 'nginx',
        },
        updateAvailable: true,
        updateKind: expect.objectContaining({
          kind: 'tag',
          localValue: '1.25.0',
          remoteValue: '4.5.6',
        }),
        result: expect.objectContaining({
          tag: '4.5.6',
          link: 'https://my-container/release-notes/',
        }),
      }),
    });
  });

  it('supports digest update simulation when real container is selected', async () => {
    (triggerService.runTrigger as jest.Mock).mockResolvedValueOnce({ ok: true });

    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await wrapper.vm.$nextTick();

    (wrapper.vm as any).selectedContainerId = 'real-container-1';
    await wrapper.vm.$nextTick();

    (wrapper.vm as any).container.updateKind.kind = 'digest';
    (wrapper.vm as any).container.updateKind.remoteValue = 'sha256:abcdef123456';

    await (wrapper.vm as any).executeTrigger();

    expect(triggerService.runTrigger).toHaveBeenCalledWith({
      triggerType: 'slack',
      triggerName: 'myslack',
      container: expect.objectContaining({
        id: 'real-container-1',
        name: 'nginx-prod',
        updateAvailable: true,
        updateKind: expect.objectContaining({
          kind: 'digest',
          remoteValue: 'sha256:abcdef123456',
        }),
        result: expect.objectContaining({
          digest: 'sha256:abcdef123456',
        }),
      }),
    });
  });

  it('resets container fields to default mock when clearing container selection', async () => {
    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await wrapper.vm.$nextTick();

    (wrapper.vm as any).selectedContainerId = 'real-container-1';
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).container.name).toBe('nginx-prod');

    (wrapper.vm as any).selectedContainerId = null;
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).container.name).toBe('container_test');
    expect((wrapper.vm as any).container.id).toBe('123456789');
    expect((wrapper.vm as any).container.watcher).toBe('watcher_test');
  });
});
