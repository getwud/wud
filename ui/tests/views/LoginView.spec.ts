import { mount } from '@vue/test-utils';
import LoginView from '@/views/LoginView.vue';
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
  push: jest.fn(),
  replace: jest.fn()
};
const mockRoute = {
    query: {} as Record<string, any>
};

describe('LoginView', () => {
  let wrapper: any;

  beforeEach(() => {
    (getStrategies as jest.Mock).mockReset();
    (getOidcRedirection as jest.Mock).mockReset();
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRoute.query = {};
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

  it('emits error notification and clears error from query when error is present on mount', (done) => {
      mockRoute.query = { error: 'Access denied: user does not belong to any authorized group' };
      mountComponent([{ type: 'basic' }]);
      expect(mockRouter.replace).toHaveBeenCalledWith({
          query: {},
      });
      setTimeout(() => {
          expect(wrapper.vm.eventBus.emit).toHaveBeenCalledWith(
              'notify',
              'Access denied: user does not belong to any authorized group',
              'error',
          );
          done();
      }, 150);
  });

  describe('Route Hook (beforeRouteEnter)', () => {
      it('does NOT automatically redirect to OIDC when an error is present in query', async () => {
          (getStrategies as jest.Mock).mockResolvedValue([
              { type: 'oidc', name: 'authentik', redirect: true }
          ]);
          const next = jest.fn();
          const to = { query: { error: 'Access denied' } };
          await LoginView.beforeRouteEnter.call(LoginView, to, {}, next);

          expect(getOidcRedirection).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(expect.any(Function));
      });
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

      it('filters supported strategies and populates vm when multiple strategies exist', async () => {
          (getStrategies as jest.Mock).mockResolvedValue([
              { type: 'basic', name: 'local' },
              { type: 'oidc', name: 'google' },
              { type: 'unsupported' }
          ]);
          const next = jest.fn();
          
          await LoginView.beforeRouteEnter.call(LoginView, { query: {} }, {}, next);
          
          expect(next).toHaveBeenCalledWith(expect.any(Function));
          const vm = { strategies: [], isSupportedStrategy: LoginView.methods.isSupportedStrategy };
          const callback = next.mock.calls[0][0];
          await callback(vm);
          
          expect(vm.strategies).toHaveLength(2);
          expect(vm.strategies[0].type).toBe('basic');
          expect(vm.strategies[1].type).toBe('oidc');
      });

      it('automatically redirects to OIDC when only OIDC strategy is available', async () => {
          (getStrategies as jest.Mock).mockResolvedValue([
              { type: 'oidc', name: 'authentik', redirect: false }
          ]);
          (getOidcRedirection as jest.Mock).mockResolvedValue({ url: 'http://authentik.com/auth' });

          const originalLocation = window.location;
          delete (window as any).location;
          (window as any).location = { href: '' };

          const next = jest.fn();
          const to = { query: { next: '/containers' } };
          await LoginView.beforeRouteEnter.call(LoginView, to, {}, next);

          expect(getOidcRedirection).toHaveBeenCalledWith('authentik', '/containers');
          expect(window.location.href).toBe('http://authentik.com/auth');
          expect(next).not.toHaveBeenCalled();

          window.location = originalLocation;
      });
  });

  describe('formatStrategyName', () => {
      it('formats basic login name', () => {
          mountComponent();
          expect(wrapper.vm.formatStrategyName({ type: 'basic', name: 'Login' })).toBe('Credentials');
          expect(wrapper.vm.formatStrategyName({ type: 'basic', name: 'admin' })).toBe('admin');
      });

      it('formats oidc provider name', () => {
          mountComponent();
          expect(wrapper.vm.formatStrategyName({ type: 'oidc', name: 'keycloak' })).toBe('Keycloak');
      });
  });
});