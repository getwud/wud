// @ts-nocheck
import Anonymous from './Anonymous';

describe('Anonymous Authentication', () => {
    let anonymous;

    beforeEach(async () => {
        anonymous = new Anonymous();
    });

    test('should create instance', async () => {
        expect(anonymous).toBeDefined();
        expect(anonymous).toBeInstanceOf(Anonymous);
    });

    test('should return anonymous strategy', async () => {
        const strategy = anonymous.getStrategy();
        expect(strategy).toBeDefined();
        expect(strategy.name).toBe('anonymous');
    });

    test('should return strategy description', async () => {
        const description = anonymous.getStrategyDescription();
        expect(description).toEqual({
            type: 'anonymous',
            name: 'Anonymous',
        });
    });
});
