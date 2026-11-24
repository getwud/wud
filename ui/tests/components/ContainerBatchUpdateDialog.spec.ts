import { mount } from '@vue/test-utils';
import ContainerBatchUpdateDialog from '@/components/ContainerBatchUpdateDialog.vue';
import * as containerService from '@/services/container';

jest.mock('@/services/container', () => ({
  getContainerTriggers: jest.fn(),
  runTriggerBatch: jest.fn(),
}));

const flush = async (wrapper: any, times = 3) => {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await wrapper.vm.$nextTick();
  }
};

describe('ContainerBatchUpdateDialog.vue', () => {
  const app = {
    id: 'c-app',
    name: 'dawarich',
    displayName: 'Dawarich',
    stack: 'dawarich',
    image: { name: 'freikin/dawarich:0.25.0', tag: { value: '0.25.0' }, created: '2023-01-01T00:00:00Z' },
    updateKind: { kind: 'tag', localValue: '0.25.0', remoteValue: '0.26.0', semverDiff: 'minor' },
    result: { tag: '0.26.0', created: '2023-02-01T00:00:00Z' },
  };
  const db = {
    id: 'c-db',
    name: 'dawarich-db',
    displayName: 'Dawarich DB',
    stack: 'dawarich',
    image: { name: 'postgres:16.3', tag: { value: '16.3' }, created: '2023-01-01T00:00:00Z' },
    updateKind: { kind: 'tag', localValue: '16.3', remoteValue: '16.4', semverDiff: 'patch' },
    result: { tag: '16.4', created: '2023-02-01T00:00:00Z' },
    isCoolingDown: true,
  };

  const composeTrigger = { id: 'dockercompose.main', type: 'dockercompose', name: 'main' };
  const dockerTrigger = { id: 'docker.local', type: 'docker', name: 'local' };
  const smtpTrigger = { id: 'smtp.admin', type: 'smtp', name: 'admin' };

  let mockEventBus: { emit: jest.Mock };

  const mountDialog = (containers: any[] = [app, db]) =>
    mount(ContainerBatchUpdateDialog, {
      props: { modelValue: true, containers },
      global: { provide: { eventBus: mockEventBus } },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = { emit: jest.fn() };
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue([
      composeTrigger,
      dockerTrigger,
      smtpTrigger,
    ]);
    (containerService.runTriggerBatch as jest.Mock).mockResolvedValue({});
  });

  it('lists every container with its version transition and stack', async () => {
    const wrapper = mountDialog();
    await flush(wrapper);

    expect(wrapper.text()).toContain('Update 2 containers');
    expect(wrapper.text()).toContain('Dawarich');
    expect(wrapper.text()).toContain('Dawarich DB');
    expect(wrapper.text()).toContain('0.25.0');
    expect(wrapper.text()).toContain('0.26.0');
    expect(wrapper.text()).toContain('16.3');
    expect(wrapper.text()).toContain('16.4');
    expect(wrapper.text()).toContain('dawarich');
    expect(wrapper.text()).toContain('rewritten and recreated only once');
  });

  it('loads triggers for every container and keeps the updater triggers they share', async () => {
    (containerService.getContainerTriggers as jest.Mock)
      .mockResolvedValueOnce([composeTrigger, dockerTrigger, smtpTrigger])
      .mockResolvedValueOnce([composeTrigger, smtpTrigger]);

    const wrapper = mountDialog();
    await flush(wrapper);

    expect(containerService.getContainerTriggers).toHaveBeenCalledTimes(2);
    expect(containerService.getContainerTriggers).toHaveBeenCalledWith('c-app');
    expect(containerService.getContainerTriggers).toHaveBeenCalledWith('c-db');
    const keys = (wrapper.vm as any).triggers.map((t: any) => `${t.type}.${t.name}`);
    expect(keys).toEqual(['dockercompose.main']);
    expect((wrapper.vm as any).selectedTriggerKey).toBe('dockercompose.main');
    expect(wrapper.text()).toContain('Target trigger');
  });

  it('prefers the dockercompose trigger when several updaters are shared', async () => {
    const wrapper = mountDialog();
    await flush(wrapper);

    expect((wrapper.vm as any).triggers).toHaveLength(2);
    expect((wrapper.vm as any).selectedTriggerKey).toBe('dockercompose.main');
    expect(wrapper.find('.v-select').exists()).toBe(true);
  });

  it('shows a warning when the containers share no updater trigger', async () => {
    (containerService.getContainerTriggers as jest.Mock)
      .mockResolvedValueOnce([dockerTrigger])
      .mockResolvedValueOnce([composeTrigger]);

    const wrapper = mountDialog();
    await flush(wrapper);

    expect((wrapper.vm as any).triggers).toHaveLength(0);
    expect(wrapper.text()).toContain('No update trigger');
    const updateBtn = wrapper.findAll('button').find((b) => b.text().includes('Update'));
    expect(updateBtn?.attributes('disabled')).toBeDefined();
  });

  it('excludes pull-based triggers when a selected container tracks an upstream image', async () => {
    const commandTrigger = { id: 'command.rebuild', type: 'command', name: 'rebuild' };
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue([
      composeTrigger,
      dockerTrigger,
      commandTrigger,
    ]);
    const upstream = { ...app, id: 'c-up', image: { ...app.image, upstream: { name: 'nginx', tag: '1.27' } } };

    const wrapper = mountDialog([upstream, db]);
    await flush(wrapper);

    const keys = (wrapper.vm as any).triggers.map((t: any) => `${t.type}.${t.name}`);
    expect(keys).toEqual(['command.rebuild']);
  });

  it('runs the batch once with all ids and never overrides cool-down', async () => {
    const wrapper = mountDialog();
    await flush(wrapper);

    expect(wrapper.text()).not.toContain('Update now');
    await (wrapper.vm as any).confirmUpdate();

    expect(containerService.runTriggerBatch).toHaveBeenCalledTimes(1);
    expect(containerService.runTriggerBatch).toHaveBeenCalledWith({
      containerIds: ['c-app', 'c-db'],
      triggerType: 'dockercompose',
      triggerName: 'main',
    });
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'notify',
      'Update triggered successfully for 2 containers',
    );
    expect(wrapper.emitted('updated')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('excludes triggers that declare no batch support', async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue([
      { ...composeTrigger, supportsBatch: false },
      { ...dockerTrigger, supportsBatch: true },
      smtpTrigger,
    ]);

    const wrapper = mountDialog();
    await flush(wrapper);

    const keys = (wrapper.vm as any).triggers.map((t: any) => `${t.type}.${t.name}`);
    expect(keys).toEqual(['docker.local']);
  });

  it('notifies an error and keeps the dialog open when the batch fails', async () => {
    (containerService.runTriggerBatch as jest.Mock).mockRejectedValue(new Error('compose file locked'));
    const wrapper = mountDialog();
    await flush(wrapper);

    await (wrapper.vm as any).confirmUpdate();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'notify',
      'Update triggered with error (compose file locked)',
      'error',
    );
    expect(wrapper.emitted('updated')).toBeFalsy();
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    expect((wrapper.vm as any).isUpdating).toBe(false);
  });

  it('empties the trigger list when loading triggers fails', async () => {
    (containerService.getContainerTriggers as jest.Mock).mockRejectedValue(new Error('boom'));
    const wrapper = mountDialog();
    await flush(wrapper);

    expect((wrapper.vm as any).triggers).toEqual([]);
    expect((wrapper.vm as any).selectedTriggerKey).toBeNull();
    expect((wrapper.vm as any).loadingTriggers).toBe(false);
  });

  it('does nothing when confirming without a selected trigger', async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue([smtpTrigger]);
    const wrapper = mountDialog();
    await flush(wrapper);

    await (wrapper.vm as any).confirmUpdate();

    expect(containerService.runTriggerBatch).not.toHaveBeenCalled();
  });

  it('renders digest updates with a shortened digest', async () => {
    const digest = {
      ...app,
      id: 'c-digest',
      image: { name: 'nginx:latest', tag: { value: 'latest' } },
      updateKind: { kind: 'digest', localValue: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaa', remoteValue: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbb' },
      result: { digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbb' },
    };
    const wrapper = mountDialog([digest]);
    await flush(wrapper);

    expect((wrapper.vm as any).newVersion(digest)).toBe('sha256:bbbbbbbb...');
    expect((wrapper.vm as any).currentVersion(digest)).toBe('latest');
    expect((wrapper.vm as any).currentVersion({ ...digest, image: {} })).toBe('sha256:aaaaaaaa...');
  });

  it('closes when the cancel button is clicked', async () => {
    const wrapper = mountDialog();
    await flush(wrapper);

    (wrapper.vm as any).close();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });
});
