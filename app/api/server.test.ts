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

    test('should call getServerConfiguration when route handler is called', async () => {
        const { getServerConfiguration } = await import('../configuration');

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        serverRouter.getServer({}, mockRes);

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
