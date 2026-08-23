import { url } from '@/services/base';

describe('Base Service', () => {
  afterEach(() => {
    delete (window as any).__WUD_BASE_PATH__;
  });

  it('should prefix path with / when no basepath is configured', () => {
    expect(url('auth/strategies')).toBe('/auth/strategies');
  });

  it('should join basepath without trailing slash and path correctly', () => {
    (window as any).__WUD_BASE_PATH__ = '/wud';
    expect(url('auth/strategies')).toBe('/wud/auth/strategies');
  });

  it('should join basepath with trailing slash and path correctly', () => {
    (window as any).__WUD_BASE_PATH__ = '/wud/';
    expect(url('auth/strategies')).toBe('/wud/auth/strategies');
  });
});
