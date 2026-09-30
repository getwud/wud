import { mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import App from '@/App.vue';
import { getUser } from '@/services/auth';
import { eventService } from '@/services/event';

const mockRoute = reactive({
  name: 'home',
  fullPath: '/',
});

jest.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}));

jest.mock('@/services/auth', () => ({
  getUser: jest.fn(),
}));

jest.mock('@/services/server', () => ({
  getServer: jest.fn(() => Promise.resolve({ configuration: {} })),
}));

jest.mock('@/services/event', () => ({
  eventService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    reconnect: jest.fn(),
    connectionState: { value: 'offline' },
  },
}));

jest.mock('vuetify', () => ({
  useTheme: () => ({
    global: {
      name: { value: 'light' },
    },
  }),
}));

describe('App.vue', () => {
  let listeners: Record<string, Function[]>;
  let mockEventBus: { on: jest.Mock; emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.name = 'home';
    mockRoute.fullPath = '/';
    (getUser as jest.Mock).mockResolvedValue(null);

    listeners = {};
    mockEventBus = {
      on: jest.fn((event: string, cb: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      }),
      emit: jest.fn((event: string, ...args: any[]) => {
        if (listeners[event]) {
          listeners[event].forEach((cb) => cb(...args));
        }
      }),
    };
  });

  const createWrapper = () => {
    return mount(App, {
      global: {
        stubs: {
          NavigationDrawer: true,
          LiveWatchHud: true,
          SnackBar: true,
          'v-app': { template: '<div class="v-app"><slot /></div>' },
          'v-main': { template: '<div class="v-main"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'router-view': { template: '<div class="router-view" />' },
        },
        provide: {
          eventBus: mockEventBus,
        },
      },
    });
  };

  it('does not render live-watch-hud and does not connect eventService when unauthenticated', async () => {
    mockRoute.name = 'login';
    const wrapper = createWrapper();
    await nextTick();

    expect(wrapper.vm.authenticated).toBe(false);
    expect(wrapper.find('live-watch-hud-stub').exists()).toBe(false);
    expect(eventService.connect).not.toHaveBeenCalled();
  });

  it('connects eventService and renders live-watch-hud on authentication', async () => {
    mockRoute.name = 'login';
    const wrapper = createWrapper();
    await nextTick();

    expect(eventService.connect).not.toHaveBeenCalled();
    expect(wrapper.find('live-watch-hud-stub').exists()).toBe(false);

    // Trigger authentication
    mockEventBus.emit('authenticated', { username: 'admin', role: 'admin' });
    await nextTick();

    expect(wrapper.vm.authenticated).toBe(true);
    expect(eventService.connect).toHaveBeenCalledTimes(1);
    expect(wrapper.find('live-watch-hud-stub').exists()).toBe(true);
  });

  it('disconnects eventService and hides live-watch-hud when navigating to login', async () => {
    const wrapper = createWrapper();
    await nextTick();

    // Authenticate first
    mockEventBus.emit('authenticated', { username: 'admin', role: 'admin' });
    await nextTick();

    expect(wrapper.vm.authenticated).toBe(true);
    expect(wrapper.find('live-watch-hud-stub').exists()).toBe(true);

    // Navigate to login
    mockRoute.name = 'login';
    await nextTick();

    expect(wrapper.vm.authenticated).toBe(false);
    expect(eventService.disconnect).toHaveBeenCalled();
    expect(wrapper.find('live-watch-hud-stub').exists()).toBe(false);
  });

  it('connects eventService when fallback getUser succeeds on non-login route', async () => {
    (getUser as jest.Mock).mockResolvedValue({ username: 'alice', role: 'ro' });
    mockRoute.name = 'containers';

    const wrapper = createWrapper();
    // Allow getUser promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));
    await nextTick();

    expect(wrapper.vm.authenticated).toBe(true);
    expect(eventService.connect).toHaveBeenCalled();
    expect(wrapper.find('live-watch-hud-stub').exists()).toBe(true);
  });
});