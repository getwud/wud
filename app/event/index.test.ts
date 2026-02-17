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
        expect(handlerMock.mock.calls.length === 1);
    },
);
