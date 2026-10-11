/**
 * Graceful shutdown management for WUD.
 * Handles SIGTERM and SIGINT, stops HTTP listener, deregisters components,
 * closes the store, and terminates cleanly with a fallback safety timer.
 */
import logger from '../log';

const log = logger.child({ component: 'shutdown' });

export interface ShutdownOptions {
    signal?: string;
    timeoutMs?: number;
    exit?: (code: number) => void;
}

let isShuttingDown = false;
let shutdownPromise: Promise<void> | undefined;
let fallbackTimer: NodeJS.Timeout | undefined;
let handlersRegistered = false;
let sigtermHandler: (() => void) | undefined;
let sigintHandler: (() => void) | undefined;

/**
 * Returns true if graceful shutdown is currently executing.
 */
export function isShutdownInProgress(): boolean {
    return isShuttingDown;
}

/**
 * Perform graceful shutdown.
 */
export async function shutdown(
    signal = 'SIGTERM',
    options: ShutdownOptions = {},
): Promise<void> {
    if (isShuttingDown) {
        log.warn(`Shutdown already in progress, ignoring duplicate ${signal}`);
        return shutdownPromise;
    }

    isShuttingDown = true;
    const timeoutMs = options.timeoutMs ?? 10000;
    const exit = options.exit ?? ((code: number) => process.exit(code));

    log.info(`Received ${signal}, initiating graceful shutdown`);

    // Fallback safety timer: force exit if graceful shutdown hangs
    fallbackTimer = setTimeout(() => {
        log.error(
            `Graceful shutdown timed out after ${timeoutMs}ms, forcing exit`,
        );
        exit(1);
    }, timeoutMs);

    if (typeof fallbackTimer.unref === 'function') {
        fallbackTimer.unref();
    }

    shutdownPromise = (async () => {
        // 1. Stop API server (close listeners, reject incoming requests, close idle sockets)
        try {
            const api = await import('../api');
            if (typeof api.close === 'function') {
                log.info('Stopping API server');
                await api.close();
            }
        } catch (e: any) {
            log.error(`Error closing API server: ${e.message}`);
        }

        // 2. Deregister all components (watchers, triggers, registries, authentications)
        try {
            const registry = await import('../registry');
            if (typeof registry.deregisterAll === 'function') {
                log.info('Deregistering all components');
                await registry.deregisterAll();
            }
        } catch (e: any) {
            log.error(`Error deregistering components: ${e.message}`);
        }

        // 3. Close database store
        try {
            const store = await import('../store');
            if (typeof store.close === 'function') {
                log.info('Closing database store');
                store.close();
            }
        } catch (e: any) {
            log.error(`Error closing database store: ${e.message}`);
        }

        if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = undefined;
        }

        log.info('Graceful shutdown completed successfully');
        exit(0);
    })();

    return shutdownPromise;
}

/**
 * Register signal listeners on process for SIGTERM and SIGINT.
 */
export function registerShutdownHandlers(options?: ShutdownOptions): void {
    unregisterShutdownHandlers();

    sigtermHandler = () => {
        shutdown('SIGTERM', options).catch((err) => {
            log.error(`Error in SIGTERM shutdown handler: ${err.message}`);
        });
    };

    sigintHandler = () => {
        shutdown('SIGINT', options).catch((err) => {
            log.error(`Error in SIGINT shutdown handler: ${err.message}`);
        });
    };

    process.on('SIGTERM', sigtermHandler);
    process.on('SIGINT', sigintHandler);
    handlersRegistered = true;
}

/**
 * Remove signal listeners from process.
 */
export function unregisterShutdownHandlers(): void {
    if (!handlersRegistered) {
        return;
    }
    if (sigtermHandler) {
        process.removeListener('SIGTERM', sigtermHandler);
        sigtermHandler = undefined;
    }
    if (sigintHandler) {
        process.removeListener('SIGINT', sigintHandler);
        sigintHandler = undefined;
    }
    handlersRegistered = false;
}

/**
 * Reset shutdown state (for testing purposes).
 */
export function resetShutdownState(): void {
    unregisterShutdownHandlers();
    isShuttingDown = false;
    shutdownPromise = undefined;
    if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
    }
}
