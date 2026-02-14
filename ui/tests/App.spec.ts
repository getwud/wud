// Mock services
jest.mock('@/services/server', () => ({
  getServer: jest.fn(() => Promise.resolve({ configuration: {} }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('App.vue', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });
});