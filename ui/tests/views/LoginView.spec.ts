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

  describe('mounted() — error query param handling', () => {
      let originalHistoryReplaceState: typeof window.history.replaceState;
      let mockHistoryReplaceState: jest.Mock;

      beforeEach(() => {
          originalHistoryReplaceState = window.history.replaceState;
          mockHistoryReplaceState = jest.fn();
          window.history.replaceState = mockHistoryReplaceState;
      });

      afterEach(() => {
          window.history.replaceState = originalHistoryReplaceState;
      });

      it('uses window.history.replaceState() (not $router.replace()) to strip ?error from URL', () => {
          // Simulate a webHistory URL where ?error is a real query param (production mode)
          Object.defineProperty(window, 'location', {
              configurable: true,
              value: { href: 'http://localhost/login?error=Access+denied' },
          });
          mockRoute.query = { error: 'Access denied' };
          mountComponent([{ type: 'oidc', name: 'authentik' }]);

          // window.history.replaceState must be called to strip ?error
          expect(mockHistoryReplaceState).toHaveBeenCalled();
          const calledUrl: string = mockHistoryReplaceState.mock.calls[0][2];
          expect(calledUrl).not.toContain('error');

          // $router.replace() must NOT be called (would re-trigger beforeRouteEnter → infinite loop)
          expect(mockRouter.replace).not.toHaveBeenCalled();
      });

      it('emits error notification after stripping ?error from URL', (done) => {
          mockRoute.query = { error: 'Access denied: user does not belong to any authorized group' };
          mountComponent([{ type: 'basic' }]);
          setTimeout(() => {
              expect(wrapper.vm.eventBus.emit).toHaveBeenCalledWith(
                  'notify',
                  'Access denied: user does not belong to any authorized group',
                  'error',
              );
              done();
          }, 150);
      });

      it('does nothing when no ?error is present on mount', () => {
          mockRoute.query = {};
          mountComponent([{ type: 'basic' }]);
          expect(mockHistoryReplaceState).not.toHaveBeenCalled();
          expect(mockRouter.replace).not.toHaveBeenCalled();
      });
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