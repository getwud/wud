import { mount } from '@vue/test-utils';
import LoginView from '@/views/LoginView';
import LoginBasic from '@/components/LoginBasic.vue';
import LoginOidc from '@/components/LoginOidc.vue';
import { getStrategies, getOidcRedirection } from '@/services/auth';

// Mock services
jest.mock('@/services/auth', () => ({
  getStrategies: jest.fn(),
  getOidcRedirection: jest.fn()
}));

// Mock router
const mockRouter = {
  push: jest.fn()
};
const mockRoute = {
    query: {}
};

describe('LoginView', () => {
  let wrapper;

  beforeEach(() => {
    (getStrategies as jest.Mock).mockReset();
    (getOidcRedirection as jest.Mock).mockReset();
    mockRouter.push.mockReset();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const mountComponent = (strategies = []) => {
      wrapper = mount(LoginView, {
          global: {
              mocks: {
                  $router: mockRouter,
                  $route: mockRoute
              },
              provide: {
                  eventBus: {
                      emit: jest.fn()
                  }
              }
          },
          data() {
              return {
                  strategies: strategies
              }
          }
      });
  };

  it('renders login dialog with basic strategy', () => {
    mountComponent([{ type: 'basic', name: 'local' }]);
    expect(wrapper.findComponent(LoginBasic).exists()).toBe(true);
    expect(wrapper.findComponent(LoginOidc).exists()).toBe(false);
  });

  it('renders login dialog with oidc strategy', () => {
    mountComponent([{ type: 'oidc', name: 'google' }]);
    expect(wrapper.findComponent(LoginBasic).exists()).toBe(false);
    expect(wrapper.findComponent(LoginOidc).exists()).toBe(true);
  });

  it('redirects to home on authentication success', () => {
    mountComponent([{ type: 'basic' }]);
    wrapper.vm.onAuthenticationSuccess();
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
  
  it('redirects to next url on authentication success if provided', () => {
      mockRoute.query.next = '/foo';
      mountComponent([{ type: 'basic' }]);
      wrapper.vm.onAuthenticationSuccess();
      expect(mockRouter.push).toHaveBeenCalledWith('/foo');
      mockRoute.query.next = undefined; // reset
  });

  describe('Route Hook (beforeRouteEnter)', () => {
      it('redirects to home if anonymous auth is enabled', async () => {
          (getStrategies as jest.Mock).mockResolvedValue([{ type: 'anonymous' }]);
          const next = jest.fn();
          
          await LoginView.beforeRouteEnter.call(LoginView, {}, {}, next);
          
          expect(next).toHaveBeenCalledWith('/');
      });

      it('redirects to OIDC url if OIDC redirect is enabled', async () => {
          (getStrategies as jest.Mock).mockResolvedValue([{ type: 'oidc', redirect: true, name: 'google' }]);
          (getOidcRedirection as jest.Mock).mockResolvedValue({ url: 'http://google.com' });
          
          // Mock window.location
          const originalLocation = window.location;
          delete window.location;
          window.location = { href: '' };
          
          const next = jest.fn();
          await LoginView.beforeRouteEnter.call(LoginView, {}, {}, next);
          
          expect(window.location.href).toBe('http://google.com');
          expect(next).not.toHaveBeenCalled();
          
          window.location = originalLocation;
      });

      it('filters supported strategies and populates vm', async () => {
          (getStrategies as jest.Mock).mockResolvedValue([
              { type: 'basic' },
              { type: 'oidc' },
              { type: 'unsupported' }
          ]);
          const next = jest.fn();
          
          await LoginView.beforeRouteEnter.call(LoginView, {}, {}, next);
          
          expect(next).toHaveBeenCalledWith(expect.any(Function));
          const vm = { strategies: [], isSupportedStrategy: LoginView.methods.isSupportedStrategy };
          const callback = next.mock.calls[0][0];
          await callback(vm);
          
          expect(vm.strategies).toHaveLength(2);
          expect(vm.strategies[0].type).toBe('basic');
          expect(vm.strategies[1].type).toBe('oidc');
      });
  });
});