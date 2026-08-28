import * as index from './index';
import * as configuration from '../configuration';
import https from 'https';
import fs from 'fs';
import express from 'express';

jest.mock('../configuration', () => ({
    getServerConfiguration: jest.fn(() => ({
        enabled: true,
        port: 3000,
        cors: { enabled: false },
        tls: { enabled: false }
    })),
    getLogLevel: jest.fn(() => 'info')
}));
jest.mock('./auth', () => ({ init: jest.fn() }));
jest.mock('./api', () => ({ init: jest.fn() }));
jest.mock('./ui', () => ({ init: jest.fn() }));
jest.mock('./prometheus', () => ({ init: jest.fn() }));
jest.mock('./health', () => ({ init: jest.fn() }));
jest.mock('https', () => ({
    createServer: jest.fn().mockReturnValue({
        listen: jest.fn((port, cb) => cb())
    })
}));
jest.mock('fs');
jest.mock('express', () => {
    const mockApp = {
        set: jest.fn(),
        use: jest.fn(),
        listen: jest.fn((port, cb) => cb())
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
            enabled: false
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
            tls: { enabled: false }
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
            tls: { enabled: true, key: 'k.pem', cert: 'c.pem' }
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
            tls: { enabled: true, key: 'k.pem', cert: 'c.pem' }
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
            tls: { enabled: true, key: 'k.pem', cert: 'c.pem' }
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
});
