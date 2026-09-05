// @ts-nocheck
// Mock all the router modules
jest.mock('express', () => ({
    Router: jest.fn(() => ({
        use: jest.fn(),
        get: jest.fn(),
    })),
}));

jest.mock('express-openapi-validator', () => ({
    middleware: jest.fn(),
}));

jest.mock('swagger-ui-express', () => ({
    serve: jest.fn(),
    setup: jest.fn(),
}));

jest.mock('./auth', () => ({
    requireAuthentication: jest.fn(),
}));

jest.mock('yamljs', () => ({
    load: jest.fn(() => ({ mockSpec: true })),
}));

import * as api from './api';
import * as OpenApiValidator from 'express-openapi-validator';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

describe('API Router', () => {
    let router;
    let auth;

    beforeEach(async () => {
        jest.clearAllMocks();
        auth = await import('./auth');
    });

    test('should initialize and return a router', async () => {
        router = api.init();
        expect(router).toBeDefined();
    });

    test('should mount OpenAPI validator and swagger UI', async () => {
        router = api.init();

        expect(YAML.load).toHaveBeenCalled();
        expect(swaggerUi.setup).toHaveBeenCalledWith({ mockSpec: true });
        expect(OpenApiValidator.middleware).toHaveBeenCalledWith(
            expect.objectContaining({
                validateRequests: true,
                validateResponses: true,
            }),
        );
        expect(router.use).toHaveBeenCalled();
        expect(router.get).toHaveBeenCalledWith(
            '/openapi.yaml',
            expect.any(Function),
        );
    });
});
