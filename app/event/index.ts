// @ts-nocheck
import events from 'events';

// Build EventEmitter
const eventEmitter = new events.EventEmitter();

// Container related events
const WUD_CONTAINER_ADDED = 'wud:container-added';
const WUD_CONTAINER_UPDATED = 'wud:container-updated';
const WUD_CONTAINER_REMOVED = 'wud:container-removed';
const WUD_CONTAINER_REPORT = 'wud:container-report';
const WUD_CONTAINER_REPORTS = 'wud:container-reports';
const WUD_CONTAINER_ROLLBACK = 'wud:container-rollback';

// Watcher events
const WUD_WATCH_START = 'wud:watch-start';
const WUD_WATCH_PROGRESS = 'wud:watch-progress';
const WUD_WATCH_STOP = 'wud:watch-stop';

// Watcher related events
const WUD_WATCHER_START = 'wud:watcher-start';
const WUD_WATCHER_STOP = 'wud:watcher-stop';

const pendingHandlers: Promise<any>[] = [];
const wrappedContainerReportsHandlers = new Map();
const wrappedContainerReportHandlers = new Map();

/**
 * Wait for all pending asynchronous event handlers to settle.
 */
export async function waitForPendingEvents(): Promise<void> {
    while (pendingHandlers.length > 0) {
        await Promise.allSettled(
            pendingHandlers.splice(0, pendingHandlers.length),
        );
    }
}

/**
 * Emit ContainerReports event.
 * @param containerReports
 */
export function emitContainerReports(containerReports) {
    eventEmitter.emit(WUD_CONTAINER_REPORTS, containerReports);
}

/**
 * Register to ContainersResult event.
 * @param handler
 */
export function registerContainerReports(handler) {
    const wrapped = (...args) => {
        const res = handler(...args);
        if (res && typeof res.then === 'function') {
            pendingHandlers.push(res);
        }
        return res;
    };
    wrappedContainerReportsHandlers.set(handler, wrapped);
    eventEmitter.on(WUD_CONTAINER_REPORTS, wrapped);
}

/**
 * Emit a container rollback event.
 * @param rollbackReport
 */
export function emitContainerRollback(rollbackReport) {
    eventEmitter.emit(WUD_CONTAINER_ROLLBACK, rollbackReport);
}

/**
 * Register to container rollback event.
 * @param handler
 */
export function registerContainerRollback(handler) {
    eventEmitter.on(WUD_CONTAINER_ROLLBACK, handler);
}

export function unregisterContainerRollback(handler) {
    eventEmitter.off(WUD_CONTAINER_ROLLBACK, handler);
}

/**
 * Emit ContainerReport event.
 * @param containerReport
 */
export function emitContainerReport(containerReport) {
    eventEmitter.emit(WUD_CONTAINER_REPORT, containerReport);
}

/**
 * Register to ContainerReport event.
 * @param handler
 */
export function registerContainerReport(handler) {
    const wrapped = (...args) => {
        const res = handler(...args);
        if (res && typeof res.then === 'function') {
            pendingHandlers.push(res);
        }
        return res;
    };
    wrappedContainerReportHandlers.set(handler, wrapped);
    eventEmitter.on(WUD_CONTAINER_REPORT, wrapped);
}

/**
 * Emit container added.
 * @param containerAdded
 */
export function emitContainerAdded(containerAdded) {
    eventEmitter.emit(WUD_CONTAINER_ADDED, containerAdded);
}

/**
 * Register to container added event.
 * @param handler
 */
export function registerContainerAdded(handler) {
    eventEmitter.on(WUD_CONTAINER_ADDED, handler);
}

/**
 * Emit container added.
 * @param containerUpdated
 */
export function emitContainerUpdated(containerUpdated) {
    eventEmitter.emit(WUD_CONTAINER_UPDATED, containerUpdated);
}

/**
 * Register to container updated event.
 * @param handler
 */
export function registerContainerUpdated(handler) {
    eventEmitter.on(WUD_CONTAINER_UPDATED, handler);
}

/**
 * Emit container removed.
 * @param containerRemoved
 */
export function emitContainerRemoved(containerRemoved) {
    eventEmitter.emit(WUD_CONTAINER_REMOVED, containerRemoved);
}

/**
 * Register to container removed event.
 * @param handler
 */
export function registerContainerRemoved(handler) {
    eventEmitter.on(WUD_CONTAINER_REMOVED, handler);
}

export function emitWatcherStart(watcher) {
    eventEmitter.emit(WUD_WATCHER_START, watcher);
}

export function registerWatcherStart(handler) {
    eventEmitter.on(WUD_WATCHER_START, handler);
}

export function emitWatcherStop(watcher) {
    eventEmitter.emit(WUD_WATCHER_STOP, watcher);
}

export function registerWatcherStop(handler) {
    eventEmitter.on(WUD_WATCHER_STOP, handler);
}

export function emitWatchStart(data) {
    eventEmitter.emit(WUD_WATCH_START, data);
}

export function registerWatchStart(handler) {
    eventEmitter.on(WUD_WATCH_START, handler);
}

export function emitWatchProgress(data) {
    eventEmitter.emit(WUD_WATCH_PROGRESS, data);
}

export function registerWatchProgress(handler) {
    eventEmitter.on(WUD_WATCH_PROGRESS, handler);
}

export function emitWatchStop(data) {
    eventEmitter.emit(WUD_WATCH_STOP, data);
}

export function registerWatchStop(handler) {
    eventEmitter.on(WUD_WATCH_STOP, handler);
}

export function unregisterContainerReports(handler) {
    const wrapped = wrappedContainerReportsHandlers.get(handler) || handler;
    eventEmitter.off(WUD_CONTAINER_REPORTS, wrapped);
    wrappedContainerReportsHandlers.delete(handler);
}
export function unregisterContainerReport(handler) {
    const wrapped = wrappedContainerReportHandlers.get(handler) || handler;
    eventEmitter.off(WUD_CONTAINER_REPORT, wrapped);
    wrappedContainerReportHandlers.delete(handler);
}
export function unregisterContainerAdded(handler) {
    eventEmitter.off(WUD_CONTAINER_ADDED, handler);
}
export function unregisterContainerUpdated(handler) {
    eventEmitter.off(WUD_CONTAINER_UPDATED, handler);
}
export function unregisterContainerRemoved(handler) {
    eventEmitter.off(WUD_CONTAINER_REMOVED, handler);
}
export function unregisterWatcherStart(handler) {
    eventEmitter.off(WUD_WATCHER_START, handler);
}
export function unregisterWatcherStop(handler) {
    eventEmitter.off(WUD_WATCHER_STOP, handler);
}
export function unregisterWatchStart(handler) {
    eventEmitter.off(WUD_WATCH_START, handler);
}
export function unregisterWatchProgress(handler) {
    eventEmitter.off(WUD_WATCH_PROGRESS, handler);
}
export function unregisterWatchStop(handler) {
    eventEmitter.off(WUD_WATCH_STOP, handler);
}
