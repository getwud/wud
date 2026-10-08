import path from 'path';

/**
 * Keyed asynchronous mutex that serializes tasks by normalized file path.
 * Guarantees that concurrent operations on the same compose file execute
 * sequentially in the order they were queued.
 */
export class ProjectMutex {
    private locks = new Map<string, Promise<void>>();

    /**
     * Run an asynchronous task exclusively for a given compose file.
     *
     * @param composeFile The compose file path to lock
     * @param task The async task to run while holding the lock
     * @returns The result of the task
     */
    async withLock<T>(composeFile: string, task: () => Promise<T>): Promise<T> {
        const normalizedKey = path.resolve(composeFile);
        const previous = this.locks.get(normalizedKey) || Promise.resolve();

        let releaseLock!: () => void;
        const current = new Promise<void>((resolve) => {
            releaseLock = resolve;
        });

        // Set the new tail of the lock chain synchronously
        this.locks.set(normalizedKey, current);

        // Wait for the previous lock holder to finish (success or error)
        await previous.catch(() => {});

        try {
            return await task();
        } finally {
            // Clean up the map if we are still the tail of the chain
            if (this.locks.get(normalizedKey) === current) {
                this.locks.delete(normalizedKey);
            }
            releaseLock();
        }
    }

    /**
     * Check if a compose file is currently locked.
     *
     * @param composeFile The compose file path to check
     * @returns true if currently locked
     */
    isLocked(composeFile: string): boolean {
        return this.locks.has(path.resolve(composeFile));
    }

    /**
     * Clear all active locks (useful for test isolation).
     */
    clear(): void {
        this.locks.clear();
    }
}

export const projectMutex = new ProjectMutex();
