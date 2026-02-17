// @ts-nocheck
// Mock express modules
jest.mock('express', () => ({
    Router: jest.fn(() => ({
        use: jest.fn(),
        get: jest.fn(),
    })),
}));

jest.mock('nocache', () => jest.fn());
jest.mock('express-healthcheck', () => jest.fn(() => 'healthcheck-middleware'));

import * as healthRouter from './health';

describe('Health Router', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('should initialize router with nocache and healthcheck', async () => {
        const router = healthRouter.init();

        expect(router).toBeDefined();
        expect(router.use).toHaveBeenCalled();
        expect(router.get).toHaveBeenCalledWith('/', 'healthcheck-middleware');
    });

    test('should use express-healthcheck middleware', async () => {
        const expressHealthcheck = await import('express-healthcheck');
        healthRouter.init();

        expect(expressHealthcheck).toHaveBeenCalled();
    });
});
