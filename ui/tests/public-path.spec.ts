describe('public-path.ts', () => {
  const originalWudBasePath = (window as any).__WUD_BASE_PATH__;

  afterEach(() => {
    (window as any).__WUD_BASE_PATH__ = originalWudBasePath;
    jest.resetModules();
  });

  it('does not set __webpack_public_path__ when __WUD_BASE_PATH__ is not set', () => {
    delete (window as any).__WUD_BASE_PATH__;
    delete (global as any).__webpack_public_path__;
    require('@/public-path');
    expect((global as any).__webpack_public_path__).toBeUndefined();
  });

  it('sets __webpack_public_path__ to base path with trailing slash', () => {
    (window as any).__WUD_BASE_PATH__ = '/wud';
    require('@/public-path');
    expect((global as any).__webpack_public_path__).toBe('/wud/');
  });

  it('keeps trailing slash when __WUD_BASE_PATH__ already has one', () => {
    (window as any).__WUD_BASE_PATH__ = '/my-app/';
    require('@/public-path');
    expect((global as any).__webpack_public_path__).toBe('/my-app/');
  });
});
