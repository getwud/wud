// @ts-nocheck
// Mock the configuration module
jest.mock('../configuration', () => ({
    getServerConfiguration: jest.fn(() => ({
        port: 3000,
        cors: {},
        enabled: true,
        feature: { delete: true },
        tls: {},
    })),
}));

// Mock express modules
jest.mock('express', () => ({
    Router: jest.fn(() => ({
        use: jest.fn(),
        get: jest.fn(),
    })),
}));

jest.mock('nocache', () => jest.fn());

import * as serverRouter from './server';

describe('Server Router', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('should initialize router with nocache and route', async () => {
        const router = serverRouter.init();

        expect(router).toBeDefined();
        expect(router.use).toHaveBeenCalled();
        expect(router.get).toHaveBeenCalledWith('/', expect.any(Function));
    });

    test('should call getServerConfiguration when route handler is called', async () => {
        const { getServerConfiguration } = await import('../configuration');
        const router = serverRouter.init();

        // Get the route handler function
        const routeHandler = router.get.mock.calls[0][1];
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        routeHandler({}, mockRes);

        expect(getServerConfiguration).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            configuration: {
                port: 3000,
                cors: {},
                enabled: true,
                feature: { delete: true },
                tls: {},
            },
        });
    });
});
