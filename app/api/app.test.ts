// @ts-nocheck
// Mock the store module
jest.mock('../store/app', () => ({
    getAppInfos: jest.fn(() => ({
        version: '1.0.0',
        name: 'wud',
        description: "What's up Docker?",
    })),
}));

// Mock express and nocache
jest.mock('express', () => ({
    Router: jest.fn(() => ({
        use: jest.fn(),
        get: jest.fn(),
    })),
}));

jest.mock('nocache', () => jest.fn());

import * as appRouter from './app';

describe('App Router', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('should call getAppInfos when route handler is called', async () => {
        const storeApp = await import('../store/app');

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        appRouter.getAppInfos({}, mockRes);

        expect(storeApp.getAppInfos).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            version: '1.0.0',
            name: 'wud',
            description: "What's up Docker?",
        });
    });
});
