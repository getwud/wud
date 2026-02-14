import * as authentication from '@/services/authentication';

describe('Authentication Service', () => {
  it('exports authentication service functions', () => {
    expect(typeof authentication).toBe('object');
  });
});