import { isDemoMode, mockService } from '@/services/mock';

describe('Mock Service and Demo Mode', () => {
  const originalEnv = process.env.VUE_APP_DEMO_MODE;

  afterEach(() => {
    process.env.VUE_APP_DEMO_MODE = originalEnv;
    delete (window as any).__WUD_DEMO_MODE__;
    mockService.resetState();
  });

  describe('isDemoMode', () => {
    it('returns true when VUE_APP_DEMO_MODE is true', () => {
      process.env.VUE_APP_DEMO_MODE = 'true';
      expect(isDemoMode()).toBe(true);
    });

    it('returns true when window.__WUD_DEMO_MODE__ is true', () => {
      process.env.VUE_APP_DEMO_MODE = 'false';
      (window as any).__WUD_DEMO_MODE__ = true;
      expect(isDemoMode()).toBe(true);
    });

    it('returns false by default', () => {
      process.env.VUE_APP_DEMO_MODE = 'false';
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('mockService operations', () => {
    it('returns app infos', async () => {
      const appInfos = await mockService.getAppInfos();
      expect(appInfos).toHaveProperty('name', 'wud');
      expect(appInfos).toHaveProperty('version');
    });

    it('returns auth strategies and user', async () => {
      const strategies = await mockService.getStrategies();
      expect(strategies.length).toBeGreaterThan(0);

      const user = await mockService.getUser();
      expect(user).toHaveProperty('username');

      const loggedIn = await mockService.loginBasic('testuser', 'pass');
      expect(loggedIn.username).toBe('testuser');

      await mockService.logout();
      const loggedOut = await mockService.getUser();
      expect(loggedOut).toBeUndefined();
    });

    it('returns and manipulates mock containers', async () => {
      const containers = await mockService.getAllContainers();
      expect(containers.length).toBeGreaterThan(0);

      const firstId = containers[0].id;
      const refreshed = await mockService.refreshContainer(firstId);
      expect(refreshed.id).toBe(firstId);

      const triggers = await mockService.getContainerTriggers(firstId);
      expect(triggers.length).toBeGreaterThan(0);

      const runRes = await mockService.runContainerTrigger({
        containerId: firstId,
        triggerType: 'apprise',
        triggerName: 'gotify'
      });
      expect(runRes.status).toBe(200);

      const initialCount = containers.length;
      await mockService.deleteContainer(firstId);
      const afterDelete = await mockService.getAllContainers();
      expect(afterDelete.length).toBe(initialCount - 1);
    });

    it('returns mock registries, watchers, triggers, and authentications', async () => {
      const registries = await mockService.getAllRegistries();
      expect(registries.length).toBeGreaterThan(0);

      const watchers = await mockService.getAllWatchers();
      expect(watchers.length).toBeGreaterThan(0);

      const triggers = await mockService.getAllTriggers();
      expect(triggers.length).toBeGreaterThan(0);

      const auths = await mockService.getAllAuthentications();
      expect(auths.length).toBeGreaterThan(0);
    });

    it('returns mock server, log, and store', async () => {
      const server = await mockService.getServer();
      expect(server).toHaveProperty('configuration');

      const log = await mockService.getLog();
      expect(log).toHaveProperty('level');

      const store = await mockService.getStore();
      expect(store).toHaveProperty('configuration');
    });
  });
});
