import * as index from './index';
import * as configuration from '../configuration';
import https from 'https';
import fs from 'fs';
import express from 'express';

const mockServer = {
    close: jest.fn((cb) => {
        if (cb) cb();
    }),
    closeIdleConnections: jest.fn(),
};

jest.mock('../configuration', () => ({
    getServerConfiguration: jest.fn(() => ({
        enabled: true,
        port: 3000,
        cors: { enabled: false },
        tls: { enabled: false },
    })),
    getLogLevel: jest.fn(() => 'info'),
}));
jest.mock('./auth', () => ({ init: jest.fn() }));
jest.mock('./api', () => ({ init: jest.fn() }));
jest.mock('./ui', () => ({ init: jest.fn() }));
jest.mock('./prometheus', () => ({ init: jest.fn() }));
jest.mock('./health', () => ({ init: jest.fn() }));
jest.mock('https', () => ({
    createServer: jest.fn().mockReturnValue({
        listen: jest.fn((port, cb) => {
            if (cb) cb();
            return mockServer;
        }),
    }),
}));
jest.mock('fs');
jest.mock('express', () => {
    const mockApp = {
        set: jest.fn(),
        use: jest.fn(),
        listen: jest.fn((port, cb) => {
            if (cb) cb();
            return mockServer;
        }),
    };
    return jest.fn(() => mockApp);
});

describe('API Index', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should not start if disabled', async () => {
        const configuration = require('../configuration');
        configuration.getServerConfiguration.mockReturnValueOnce({
            enabled: false,
        });

        // Re-import index.ts so it picks up the mocked configuration
        jest.isolateModules(() => {
            const indexLocal = require('./index');
            indexLocal.init();
        });
        expect(express).not.toHaveBeenCalled();
    });

    test('should start plain HTTP if enabled', async () => {
        const configuration = require('../configuration');
        configuration.getServerConfiguration.mockReturnValueOnce({
            enabled: true,
            port: 3000,
            cors: { enabled: true, origin: '*', methods: '*' },
            tls: { enabled: false },
        });

        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await indexLocal.init();

        const app = (express as unknown as jest.Mock).mock.results[0].value;
        expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    test('should start HTTPS if TLS enabled', async () => {
        const configuration = require('../configuration');
        configuration.getServerConfiguration.mockReturnValueOnce({
            enabled: true,
            port: 3000,
            cors: { enabled: false },
            tls: { enabled: true, key: 'k.pem', cert: 'c.pem' },
        });
        (fs.readFileSync as jest.Mock).mockReturnValue('cert-content');

        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await indexLocal.init();

        expect(fs.readFileSync).toHaveBeenCalledWith('k.pem');
        expect(fs.readFileSync).toHaveBeenCalledWith('c.pem');
        expect(https.createServer).toHaveBeenCalled();
    });

    test('should throw if TLS key fails to read', async () => {
        const configuration = require('../configuration');
        configuration.getServerConfiguration.mockReturnValueOnce({
            enabled: true,
            port: 3000,
            cors: { enabled: false },
            tls: { enabled: true, key: 'k.pem', cert: 'c.pem' },
        });
        (fs.readFileSync as jest.Mock).mockImplementation((file) => {
            if (file === 'k.pem') throw new Error('key err');
            return 'cert-content';
        });

        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await expect(indexLocal.init()).rejects.toThrow('key err');
    });

    test('should throw if TLS cert fails to read', async () => {
        const configuration = require('../configuration');
        configuration.getServerConfiguration.mockReturnValueOnce({
            enabled: true,
            port: 3000,
            cors: { enabled: false },
            tls: { enabled: true, key: 'k.pem', cert: 'c.pem' },
        });
        (fs.readFileSync as jest.Mock).mockImplementation((file) => {
            if (file === 'c.pem') throw new Error('cert err');
            return 'cert-content';
        });

        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await expect(indexLocal.init()).rejects.toThrow('cert err');
    });

    test('close should do nothing when server is not running', async () => {
        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await expect(indexLocal.close()).resolves.toBeUndefined();
    });

    test('close should close server and closeIdleConnections', async () => {
        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await indexLocal.init();
        expect(indexLocal.getServer()).toBeDefined();

        await indexLocal.close();

        expect(mockServer.closeIdleConnections).toHaveBeenCalled();
        expect(mockServer.close).toHaveBeenCalled();
        expect(indexLocal.getServer()).toBeUndefined();
    });

    test('close should reject when server.close returns an error', async () => {
        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        await indexLocal.init();

        mockServer.close.mockImplementationOnce((cb) =>
            cb(new Error('close failed')),
        );

        await expect(indexLocal.close()).rejects.toThrow('close failed');
    });

    test('stop should be alias for close', async () => {
        let indexLocal;
        jest.isolateModules(() => {
            indexLocal = require('./index');
        });
        expect(indexLocal.stop).toBe(indexLocal.close);
    });
});
