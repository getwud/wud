import { ConcurrencyPool } from './concurrency';

describe('ConcurrencyPool', () => {
    test('should run tasks sequentially if maxConcurrent is 1', async () => {
        const pool = new ConcurrencyPool(1);
        const order: number[] = [];

        const task1 = pool.run(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            order.push(1);
            return 't1';
        });

        const task2 = pool.run(async () => {
            order.push(2);
            return 't2';
        });

        const [r1, r2] = await Promise.all([task1, task2]);

        expect(r1).toBe('t1');
        expect(r2).toBe('t2');
        expect(order).toEqual([1, 2]);
    });

    test('should respect maxConcurrent limit', async () => {
        const pool = new ConcurrencyPool(2);
        let active = 0;
        let maxActiveObserved = 0;

        const tasks = Array.from({ length: 10 }, (_, i) =>
            pool.run(async () => {
                active++;
                maxActiveObserved = Math.max(maxActiveObserved, active);
                await new Promise((resolve) => setTimeout(resolve, 20));
                active--;
                return i;
            }),
        );

        const results = await Promise.all(tasks);

        expect(results).toHaveLength(10);
        expect(maxActiveObserved).toBeLessThanOrEqual(2);
    });

    test('should continue executing queue even if a task throws', async () => {
        const pool = new ConcurrencyPool(1);

        const failedTask = pool.run(async () => {
            throw new Error('Task failure');
        });

        const successfulTask = pool.run(async () => {
            return 'success';
        });

        await expect(failedTask).rejects.toThrow('Task failure');
        await expect(successfulTask).resolves.toBe('success');
    });
});
