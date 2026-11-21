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
      $loki: 1,
      meta: { created: 12345 },
      id: 'real-container-1',
      name: 'nginx-prod',
      displayName: 'Nginx Prod',
      watcher: 'local',
      stack: 'web',
      labels: {
        'com.docker.compose.service': 'nginx',
        'wud.hook.1.command': 'id',
      },
      image: {
        id: 'sha256:img1',
        name: 'library/nginx',
        registry: { name: 'hub', url: 'https://registry-1.docker.io/v2' },
        tag: {
          value: '1.25.0',
          semver: true,
        },
        digest: {
          watch: false,
          value: 'sha256:olddigest',
        },
        architecture: 'amd64',
        os: 'linux',
        extraUnsafe: 'should-not-forward',
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

  it('calls runTrigger with clean allowlisted mock container without labels when no real container is selected', async () => {
    (triggerService.runTrigger as jest.Mock).mockResolvedValueOnce({ ok: true });

    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await (wrapper.vm as any).executeTrigger();
    expect(triggerService.runTrigger).toHaveBeenCalledTimes(1);
    const callArg = (triggerService.runTrigger as jest.Mock).mock.calls[0][0];
    expect(callArg).toEqual({
      triggerType: 'slack',
      triggerName: 'myslack',
      container: {
        id: '123456789',
        name: 'container_test',
        watcher: 'watcher_test',
        stack: 'test-stack',
        updateAvailable: true,
        updateKind: {
          kind: 'tag',
          semverDiff: 'major',
          localValue: '1.2.3',
          remoteValue: '4.5.6',
        },
        result: {
          tag: '4.5.6',
          link: 'https://my-container/release-notes/',
        },
      },
    });
    expect(callArg.container).not.toHaveProperty('labels');
  });

  it('pre-fills fields and sends sanitized allowlisted payload without labels or internal store fields when real container is selected', async () => {
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

    expect(triggerService.runTrigger).toHaveBeenCalledTimes(1);
    const callArg = (triggerService.runTrigger as jest.Mock).mock.calls[0][0];
    expect(callArg).toEqual({
      triggerType: 'slack',
      triggerName: 'myslack',
      container: {
        id: 'real-container-1',
        name: 'nginx-prod',
        displayName: 'Nginx Prod',
        watcher: 'local',
        stack: 'web',
        updateAvailable: true,
        updateKind: {
          kind: 'tag',
          semverDiff: 'major',
          localValue: '1.25.0',
          remoteValue: '4.5.6',
        },
        result: {
          tag: '4.5.6',
          link: 'https://my-container/release-notes/',
        },
        image: {
          id: 'sha256:img1',
          name: 'library/nginx',
          registry: { name: 'hub', url: 'https://registry-1.docker.io/v2' },
          tag: { value: '1.25.0', semver: true },
          digest: { watch: false, value: 'sha256:olddigest' },
          architecture: 'amd64',
          os: 'linux',
        },
      },
    });
    expect(callArg.container).not.toHaveProperty('labels');
    expect(callArg.container).not.toHaveProperty('$loki');
    expect(callArg.container).not.toHaveProperty('meta');
    expect(callArg.container.image).not.toHaveProperty('extraUnsafe');
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
