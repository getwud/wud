export class ConcurrencyPool {
    private activeCount = 0;
    private readonly queue: Array<() => void> = [];

    constructor(private readonly maxConcurrent: number) {}

    async run<T>(fn: () => Promise<T>): Promise<T> {
        if (this.activeCount >= this.maxConcurrent) {
            await new Promise<void>((resolve) => this.queue.push(resolve));
        }
        this.activeCount++;
        try {
            return await fn();
        } finally {
            this.activeCount--;
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next) {
                    next();
                }
            }
        }
    }
}
