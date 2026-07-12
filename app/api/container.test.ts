// @ts-nocheck
jest.mock('express', () => ({
    Router: jest.fn(() => ({
        use: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
    })),
}));

jest.mock('nocache', () => jest.fn());

jest.mock('../configuration', () => ({
    getLogLevel: jest.fn(() => 'info'),
    getServerConfiguration: jest.fn(() => ({
        feature: {
            delete: true,
        },
    })),
}));

jest.mock('../store/container', () => ({
    getContainer: jest.fn(),
    getContainers: jest.fn(),
    deleteContainer: jest.fn(),
}));

jest.mock('../registry', () => ({
    getState: jest.fn(),
}));

import * as containerRouter from './container';
import * as storeContainer from '../store/container';
import * as registry from '../registry';

function createTrigger(type, name, configuration) {
    return {
        type,
        name,
        maskConfiguration: () => configuration,
    };
}

describe('Container Router', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('getContainerTriggers should not associate opt-in triggers by default', async () => {
        const router = containerRouter.init();
        const routeHandler = router.get.mock.calls.find(
            ([route]) => route === '/:id/triggers',
        )[1];

        storeContainer.getContainer.mockReturnValue({
            id: 'container1',
        });
        registry.getState.mockReturnValue({
            trigger: {
                'smtp.gmail': createTrigger('smtp', 'gmail', {
                    includebydefault: true,
                }),
                'dockercompose.local': createTrigger('dockercompose', 'local', {
                    includebydefault: false,
                }),
            },
        });

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await routeHandler({ params: { id: 'container1' } }, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith([
            {
                id: 'smtp.gmail',
                type: 'smtp',
                name: 'gmail',
                configuration: {
                    includebydefault: true,
                },
            },
        ]);
    });

    test('getContainerTriggers should associate explicitly included opt-in triggers', async () => {
        const router = containerRouter.init();
        const routeHandler = router.get.mock.calls.find(
            ([route]) => route === '/:id/triggers',
        )[1];

        storeContainer.getContainer.mockReturnValue({
            id: 'container1',
            triggerInclude: 'dockercompose.local:minor',
        });
        registry.getState.mockReturnValue({
            trigger: {
                'smtp.gmail': createTrigger('smtp', 'gmail', {
                    includebydefault: true,
                }),
                'dockercompose.local': createTrigger('dockercompose', 'local', {
                    includebydefault: false,
                }),
            },
        });

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await routeHandler({ params: { id: 'container1' } }, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith([
            {
                id: 'dockercompose.local',
                type: 'dockercompose',
                name: 'local',
                configuration: {
                    includebydefault: false,
                    threshold: 'minor',
                },
            },
        ]);
    });
});
