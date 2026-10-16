import { mount, VueWrapper } from '@vue/test-utils';
import LogsView from '@/views/LogsView.vue';
import * as logService from '@/services/log';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';

jest.mock('@/services/log', () => ({
  getLog: jest.fn(() => Promise.resolve({ level: 'info' })),
  getLogIcon: jest.fn(() => 'mdi-bug'),
  streamLogs: jest.fn((callback) => {
    // simulate initial logs arrival
    callback({
      time: 1700000000000,
      level: 40,
      component: 'watcher.docker.local',
      container: 'local_mycontainer',
      msg: 'No tags found after filtering; check your regex filters',
    });
    callback({
      time: 1700000001000,
      level: 30,
      component: 'core',
      msg: 'Server is running',
    });
    return { close: jest.fn() };
  }),
}));

describe('LogsView', () => {
  let wrapper: VueWrapper<InstanceType<typeof LogsView>>;

  beforeEach(() => {
    wrapper = mount(LogsView, {
      global: {
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-card': { template: '<div><slot /></div>' },
          'v-toolbar': { template: '<div><slot /></div>' },
          'v-icon': { template: '<i></i>' },
          'v-chip': { template: '<span><slot /></span>' },
          'v-spacer': { template: '<div />' },
          'v-text-field': { template: '<input />' },
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-card-text': { template: '<div ref="logContainer"><slot /></div>' },
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders correctly and connects to log stream', () => {
    expect(wrapper.text()).toContain('Application Logs');
    expect(logService.streamLogs).toHaveBeenCalled();
  });

  it('displays streamed log message with component and container badge', () => {
    expect(wrapper.text()).toContain('No tags found after filtering; check your regex filters');
    expect(wrapper.text()).toContain('[watcher.docker.local]');
    expect(wrapper.text()).toContain('[local_mycontainer]');
    expect(wrapper.text()).toContain('WARN');

    // Check title attribute on component span
    const componentSpan = wrapper.find('span[title="watcher.docker.local"]');
    expect(componentSpan.exists()).toBe(true);

    // Check container badge and its title attribute
    const containerBadge = wrapper.find('.container-badge');
    expect(containerBadge.exists()).toBe(true);
    expect(containerBadge.attributes('title')).toBe('local_mycontainer');
    expect(containerBadge.text()).toBe('[local_mycontainer]');
  });

  it('renders logs without container cleanly without container badge', () => {
    expect(wrapper.text()).toContain('Server is running');
    expect(wrapper.text()).toContain('[core]');
    expect(wrapper.text()).toContain('INFO');

    // Only one container badge rendered across the two log lines
    const containerBadges = wrapper.findAll('.container-badge');
    expect(containerBadges).toHaveLength(1);
  });

  it('filters logs according to search input by container name', async () => {
    // Filter by container substring
    await wrapper.setData({ search: 'mycontainer' });
    expect(wrapper.text()).toContain('No tags found after filtering; check your regex filters');
    expect(wrapper.text()).not.toContain('Server is running');

    // Filter by container with brackets
    await wrapper.setData({ search: '[local_mycontainer]' });
    expect(wrapper.text()).toContain('No tags found after filtering; check your regex filters');
    expect(wrapper.text()).not.toContain('Server is running');
  });

  it('filters logs according to search input by component, msg, or level', async () => {
    // Filter by component
    await wrapper.setData({ search: 'core' });
    expect(wrapper.text()).toContain('Server is running');
    expect(wrapper.text()).not.toContain('No tags found');

    // Filter by msg
    await wrapper.setData({ search: 'regex filters' });
    expect(wrapper.text()).toContain('No tags found after filtering; check your regex filters');
    expect(wrapper.text()).not.toContain('Server is running');

    // Filter by level
    await wrapper.setData({ search: 'WARN' });
    expect(wrapper.text()).toContain('No tags found after filtering; check your regex filters');
    expect(wrapper.text()).not.toContain('Server is running');

    // Non-existent search
    await wrapper.setData({ search: 'nonexistent' });
    expect(wrapper.text()).toContain('No logs match the filter');
  });

  it('clears logs when clearLogs is called', async () => {
    expect(wrapper.vm.logLines.length).toBe(2);
    wrapper.vm.clearLogs();
    expect(wrapper.vm.logLines.length).toBe(0);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Waiting for incoming logs...');
  });

  it('handles formatDate edge cases', () => {
    expect(wrapper.vm.formatDate(0)).toBe('');
    const formatted = wrapper.vm.formatDate(1700000000000);
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it('maps level numbers to level names and colors', () => {
    expect(wrapper.vm.getLevelName(10)).toBe('TRACE');
    expect(wrapper.vm.getLevelName(20)).toBe('DEBUG');
    expect(wrapper.vm.getLevelName(30)).toBe('INFO');
    expect(wrapper.vm.getLevelName(40)).toBe('WARN');
    expect(wrapper.vm.getLevelName(50)).toBe('ERROR');
    expect(wrapper.vm.getLevelName(60)).toBe('FATAL');
    expect(wrapper.vm.getLevelName(999)).toBe('INFO');

    expect(wrapper.vm.getLevelColor(10)).toBe('text-grey');
    expect(wrapper.vm.getLevelColor(20)).toBe('text-blue');
    expect(wrapper.vm.getLevelColor(30)).toBe('text-green');
    expect(wrapper.vm.getLevelColor(40)).toBe('text-yellow');
    expect(wrapper.vm.getLevelColor(50)).toBe('text-red');
    expect(wrapper.vm.getLevelColor(60)).toBe('text-purple');
    expect(wrapper.vm.getLevelColor(999)).toBe('text-green');
  });

  it('handles beforeRouteEnter success path', async () => {
    const to = {} as RouteLocationNormalized;
    const from = {} as RouteLocationNormalized;
    let nextCallback: (vm: unknown) => void = () => {};
    const next: NavigationGuardNext = jest.fn((cb) => {
      if (typeof cb === 'function') {
        nextCallback = cb as (vm: unknown) => void;
      }
    }) as unknown as NavigationGuardNext;

    const beforeRouteEnter = LogsView.beforeRouteEnter as (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => Promise<void>;

    await beforeRouteEnter(to, from, next);
    expect(next).toHaveBeenCalled();

    const vm = { log: {} };
    nextCallback(vm);
    expect(vm.log).toEqual({ level: 'info' });
  });

  it('handles beforeRouteEnter error path', async () => {
    (logService.getLog as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const to = {} as RouteLocationNormalized;
    const from = {} as RouteLocationNormalized;
    let nextCallback: (vm: unknown) => void = () => {};
    const next: NavigationGuardNext = jest.fn((cb) => {
      if (typeof cb === 'function') {
        nextCallback = cb as (vm: unknown) => void;
      }
    }) as unknown as NavigationGuardNext;

    const beforeRouteEnter = LogsView.beforeRouteEnter as (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => Promise<void>;

    await beforeRouteEnter(to, from, next);
    expect(next).toHaveBeenCalled();

    const emitMock = jest.fn();
    const vm = { $eventBus: { emit: emitMock } };
    nextCallback(vm);
    expect(emitMock).toHaveBeenCalledWith(
      'notify',
      'Error when trying to load the log configuration (Network error)',
      'error'
    );
  });
});
