import { EventEmitter } from 'events';
import { Container } from '../model/container';
import { Watcher } from '../watchers/Watcher';

export interface ContainerReport {
    container: Container,
    changed?: boolean
}

// Build EventEmitter
const eventEmitter = new EventEmitter<{
    [WUD_CONTAINER_ADDED]: [Container];
    [WUD_CONTAINER_UPDATED]: [Container];
    [WUD_CONTAINER_REMOVED]: [Container];
    [WUD_CONTAINER_REPORT]: [ContainerReport];
    [WUD_CONTAINER_REPORTS]: [ContainerReport[]];
    [WUD_WATCHER_START]: [Watcher];
    [WUD_WATCHER_STOP]: [Watcher];
}>();

// Container related events
const WUD_CONTAINER_ADDED = 'wud:container-added';
const WUD_CONTAINER_UPDATED = 'wud:container-updated';
const WUD_CONTAINER_REMOVED = 'wud:container-removed';
const WUD_CONTAINER_REPORT = 'wud:container-report';
const WUD_CONTAINER_REPORTS = 'wud:container-reports';

// Watcher related events
const WUD_WATCHER_START = 'wud:watcher-start';
const WUD_WATCHER_STOP = 'wud:watcher-stop';

/**
 * Emit ContainerReports event.
 * @param containerReports
 */
export function emitContainerReports(containerReports: ContainerReport[]) {
    eventEmitter.emit(WUD_CONTAINER_REPORTS, containerReports);
}

/**
 * Register to ContainersResult event.
 * @param handler
 */
export function registerContainerReports(handler: (reports: ContainerReport[]) => void) {
    eventEmitter.on(WUD_CONTAINER_REPORTS, handler);
}

/**
 * Emit ContainerReport event.
 * @param containerReport
 */
export function emitContainerReport(containerReport: ContainerReport) {
    eventEmitter.emit(WUD_CONTAINER_REPORT, containerReport);
}

/**
 * Register to ContainerReport event.
 * @param handler
 */
export function registerContainerReport(handler: (report: ContainerReport) => void) {
    eventEmitter.on(WUD_CONTAINER_REPORT, handler);
}

/**
 * Emit container added.
 * @param containerAdded
 */
export function emitContainerAdded(containerAdded: Container) {
    eventEmitter.emit(WUD_CONTAINER_ADDED, containerAdded);
}

/**
 * Register to container added event.
 * @param handler
 */
export function registerContainerAdded(handler: (container: Container) => void) {
    eventEmitter.on(WUD_CONTAINER_ADDED, handler);
}

/**
 * Emit container added.
 * @param containerUpdated
 */
export function emitContainerUpdated(containerUpdated: Container) {
    eventEmitter.emit(WUD_CONTAINER_UPDATED, containerUpdated);
}

/**
 * Register to container updated event.
 * @param handler
 */
export function registerContainerUpdated(handler: (container: Container) => void) {
    eventEmitter.on(WUD_CONTAINER_UPDATED, handler);
}

/**
 * Emit container removed.
 * @param containerRemoved
 */
export function emitContainerRemoved(containerRemoved: Container) {
    eventEmitter.emit(WUD_CONTAINER_REMOVED, containerRemoved);
}

/**
 * Register to container removed event.
 * @param handler
 */
export function registerContainerRemoved(handler: (removed: Container) => void) {
    eventEmitter.on(WUD_CONTAINER_REMOVED, handler);
}

export function emitWatcherStart(watcher: Watcher) {
    eventEmitter.emit(WUD_WATCHER_START, watcher);
}

export function registerWatcherStart(handler: (watcher: Watcher) => void) {
    eventEmitter.on(WUD_WATCHER_START, handler);
}

export function emitWatcherStop(watcher: Watcher) {
    eventEmitter.emit(WUD_WATCHER_STOP, watcher);
}

export function registerWatcherStop(handler: (watcher: Watcher) => void) {
    eventEmitter.on(WUD_WATCHER_STOP, handler);
}

