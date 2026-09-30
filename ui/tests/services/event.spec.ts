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

  it('starts offline and does not connect automatically in constructor', () => {
    const { eventService } = require('@/services/event');

    expect(MockEventSourceClass).not.toHaveBeenCalled();
    expect(eventService.connectionState.value).toBe('offline');
  });

  it('connects to url("api/events") with credentials when connect() is called', () => {
    const { eventService } = require('@/services/event');

    eventService.connect();

    expect(MockEventSourceClass).toHaveBeenCalledTimes(1);
    expect(MockEventSourceClass).toHaveBeenCalledWith('/api/events', {
      withCredentials: true,
    });
    expect(eventService.connectionState.value).toBe('reconnecting');
  });

  it('does not create duplicate connection if connect() is called when already connected', () => {
    const { eventService } = require('@/services/event');

    eventService.connect();
    expect(MockEventSourceClass).toHaveBeenCalledTimes(1);

    eventService.connect();
    expect(MockEventSourceClass).toHaveBeenCalledTimes(1);
  });

  it('respects __WUD_BASE_PATH__ when constructing url', () => {
    (window as any).__WUD_BASE_PATH__ = '/custom-path';
    const { eventService } = require('@/services/event');

    eventService.connect();

    expect(MockEventSourceClass).toHaveBeenCalledWith('/custom-path/api/events', {
      withCredentials: true,
    });
  });

  it('handles connection lifecycle events', () => {
    const { eventService } = require('@/services/event');
    eventService.connect();

    // Simulate onopen
    mockEventSourceInstance.onopen();
    expect(eventService.connectionState.value).toBe('connected');

    // Simulate onerror
    mockEventSourceInstance.onerror();
    expect(eventService.connectionState.value).toBe('offline');
  });

  it('disconnect closes the EventSource and sets state to offline', () => {
    const { eventService } = require('@/services/event');
    eventService.connect();

    mockEventSourceInstance.onopen();
    expect(eventService.connectionState.value).toBe('connected');

    eventService.disconnect();
    expect(mockEventSourceInstance.close).toHaveBeenCalledTimes(1);
    expect(eventService.connectionState.value).toBe('offline');

    // Calling disconnect again when already disconnected is safe
    eventService.disconnect();
    expect(mockEventSourceInstance.close).toHaveBeenCalledTimes(1);
    expect(eventService.connectionState.value).toBe('offline');
  });

  it('dispatches messages to handlers and updates lastEvent', () => {
    const { eventService } = require('@/services/event');
    eventService.connect();
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
    eventService.connect();
    expect(MockEventSourceClass).toHaveBeenCalledTimes(1);

    eventService.reconnect();
    expect(mockEventSourceInstance.close).toHaveBeenCalledTimes(1);
    expect(MockEventSourceClass).toHaveBeenCalledTimes(2);
  });
});
