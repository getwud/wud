const mockLogger: any = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(),
    level: 'info',
    bindings: jest.fn(() => ({ name: 'whats-up-docker' })),
};
mockLogger.child.mockReturnValue(mockLogger);

export default mockLogger;
