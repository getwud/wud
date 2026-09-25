// @ts-nocheck
import * as event from './index';

const eventTestCases = [
    {
        emitter: event.emitContainerReports,
        register: event.registerContainerReports,
    },
    {
        emitter: event.emitContainerReport,
        register: event.registerContainerReport,
    },
    {
        emitter: event.emitContainerAdded,
        register: event.registerContainerAdded,
    },
    {
        emitter: event.emitContainerUpdated,
        register: event.registerContainerUpdated,
    },
    {
        emitter: event.emitContainerRemoved,
        register: event.registerContainerRemoved,
    },
    {
        emitter: event.emitWatcherStart,
        register: event.registerWatcherStart,
    },
    {
        emitter: event.emitWatcherStop,
        register: event.registerWatcherStop,
    },
];
test.each(eventTestCases)(
    'the registered $register.name function must execute the handler when the $emitter.name emitter function is called',
    async ({ register, emitter }) => {
        // Register an handler
        const handlerMock = jest.fn((item) => item);
        register(handlerMock);

        // Emit the event
        emitter();

        // Ensure handler is called
        expect(handlerMock).toHaveBeenCalledTimes(1);
    },
);

describe('waitForPendingEvents', () => {
    test('should wait for asynchronous container report handlers to complete', async () => {
        let reportFinished = false;
        let reportsFinished = false;

        const reportHandler = jest.fn(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            reportFinished = true;
        });
        const reportsHandler = jest.fn(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            reportsFinished = true;
        });

        event.registerContainerReport(reportHandler);
        event.registerContainerReports(reportsHandler);

        event.emitContainerReport({ id: 'c1' });
        event.emitContainerReports([{ id: 'c1' }]);

        expect(reportFinished).toBe(false);
        expect(reportsFinished).toBe(false);

        await event.waitForPendingEvents();

        expect(reportFinished).toBe(true);
        expect(reportsFinished).toBe(true);

        event.unregisterContainerReport(reportHandler);
        event.unregisterContainerReports(reportsHandler);
    });

    test('should settle even if an async handler rejects', async () => {
        const failingHandler = jest.fn(async () => {
            throw new Error('trigger failure');
        });

        event.registerContainerReport(failingHandler);
        event.emitContainerReport({ id: 'c2' });

        await expect(event.waitForPendingEvents()).resolves.toBeUndefined();

        event.unregisterContainerReport(failingHandler);
    });

    test('should properly unregister wrapped handlers', () => {
        const handler = jest.fn();
        event.registerContainerReport(handler);
        event.unregisterContainerReport(handler);
        event.emitContainerReport({ id: 'c3' });
        expect(handler).not.toHaveBeenCalled();

        const reportsHandler = jest.fn();
        event.registerContainerReports(reportsHandler);
        event.unregisterContainerReports(reportsHandler);
        event.emitContainerReports([{ id: 'c3' }]);
        expect(reportsHandler).not.toHaveBeenCalled();
    });
});
