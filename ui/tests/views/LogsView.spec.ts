import { mount } from '@vue/test-utils';
import LogsView from '@/views/LogsView.vue';
import * as logService from '@/services/log';

jest.mock('@/services/log', () => ({
  getLog: jest.fn(() => Promise.resolve({ level: 'info' })),
  getLogIcon: jest.fn(() => 'mdi-bug'),
  streamLogs: jest.fn((callback) => {
    // simulate immediate log arrival
    callback({
      time: 1700000000000,
      level: 30,
      component: 'test-comp',
      msg: 'Test log message',
    });
    return { close: jest.fn() };
  }),
}));

describe('LogsView', () => {
  let wrapper: any;

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

  it('displays streamed log message', () => {
    expect(wrapper.text()).toContain('Test log message');
    expect(wrapper.text()).toContain('[test-comp]');
    expect(wrapper.text()).toContain('INFO');
  });

  it('filters logs according to search input', async () => {
    await wrapper.setData({ search: 'nonexistent' });
    expect(wrapper.text()).toContain('No logs match the filter');

    await wrapper.setData({ search: 'test-comp' });
    expect(wrapper.text()).toContain('Test log message');
  });

  it('clears logs when clearLogs is called', async () => {
    expect(wrapper.vm.logLines.length).toBe(1);
    wrapper.vm.clearLogs();
    expect(wrapper.vm.logLines.length).toBe(0);
  });
});
