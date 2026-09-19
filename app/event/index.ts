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

// Watcher events
const WUD_WATCH_START = 'wud:watch-start';
const WUD_WATCH_PROGRESS = 'wud:watch-progress';
const WUD_WATCH_STOP = 'wud:watch-stop';

// Watcher related events
const WUD_WATCHER_START = 'wud:watcher-start';
const WUD_WATCHER_STOP = 'wud:watcher-stop';

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
    eventEmitter.on(WUD_CONTAINER_REPORTS, handler);
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
    eventEmitter.on(WUD_CONTAINER_REPORT, handler);
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
    eventEmitter.off(WUD_CONTAINER_REPORTS, handler);
}
export function unregisterContainerReport(handler) {
    eventEmitter.off(WUD_CONTAINER_REPORT, handler);
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
