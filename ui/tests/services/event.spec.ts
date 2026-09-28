describe('Event Service', () => {
  let MockEventSourceClass: jest.Mock;
  let mockEventSourceInstance: any;

  beforeEach(() => {
    jest.resetModules();
    mockEventSourceInstance = {
      close: jest.fn(),
      onopen: null,
      onerror: null,
      onmessage: null,
    };
    MockEventSourceClass = jest.fn().mockImplementation((url, init) => {
      mockEventSourceInstance.url = url;
      mockEventSourceInstance.init = init;
      return mockEventSourceInstance;
    });
    global.EventSource = MockEventSourceClass as any;
  });

  afterEach(() => {
    delete (window as any).__WUD_BASE_PATH__;
  });

  it('initializes EventSource with url("api/events") and credentials', () => {
    const { eventService } = require('@/services/event');

    expect(MockEventSourceClass).toHaveBeenCalledWith('/api/events', {
      withCredentials: true,
    });
    expect(eventService.connectionState.value).toBe('reconnecting');
  });

  it('respects __WUD_BASE_PATH__ when constructing url', () => {
    (window as any).__WUD_BASE_PATH__ = '/custom-path';
    require('@/services/event');

    expect(MockEventSourceClass).toHaveBeenCalledWith('/custom-path/api/events', {
      withCredentials: true,
    });
  });

  it('handles connection lifecycle events', () => {
    const { eventService } = require('@/services/event');

    // Simulate onopen
    mockEventSourceInstance.onopen();
    expect(eventService.connectionState.value).toBe('connected');

    // Simulate onerror
    mockEventSourceInstance.onerror();
    expect(eventService.connectionState.value).toBe('offline');
  });

  it('dispatches messages to handlers and updates lastEvent', () => {
    const { eventService } = require('@/services/event');
    const handler = jest.fn();

    eventService.on('container.update', handler);

    // Keepalive should be ignored
    mockEventSourceInstance.onmessage({ data: ': keepalive' });
    expect(handler).not.toHaveBeenCalled();

    // Valid event
    const eventPayload = { type: 'container.update', data: { id: 'c1' } };
    mockEventSourceInstance.onmessage({ data: JSON.stringify(eventPayload) });

    expect(handler).toHaveBeenCalledWith({ id: 'c1' });
    expect(eventService.lastEvent.value).toEqual(eventPayload);

    // Unregister handler
    eventService.off('container.update', handler);
    mockEventSourceInstance.onmessage({ data: JSON.stringify(eventPayload) });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports reconnecting', () => {
    const { eventService } = require('@/services/event');
    expect(MockEventSourceClass).toHaveBeenCalledTimes(1);

    eventService.reconnect();
    expect(mockEventSourceInstance.close).toHaveBeenCalledTimes(1);
    expect(MockEventSourceClass).toHaveBeenCalledTimes(2);
  });
});
