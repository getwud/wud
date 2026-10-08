import { ProjectMutex } from './mutex';

describe('ProjectMutex', () => {
    let mutex: ProjectMutex;

    beforeEach(() => {
        mutex = new ProjectMutex();
    });

    test('should execute tasks sequentially on the same file', async () => {
        const order: string[] = [];
        let task1Running = false;
        let task2StartedWhileTask1Running = false;

        const task1 = mutex.withLock('/tmp/docker-compose.yml', async () => {
            order.push('task1-start');
            task1Running = true;
            await new Promise((resolve) => setTimeout(resolve, 50));
            order.push('task1-end');
            task1Running = false;
        });

        const task2 = mutex.withLock('/tmp/docker-compose.yml', async () => {
            if (task1Running) {
                task2StartedWhileTask1Running = true;
            }
            order.push('task2-start');
            await new Promise((resolve) => setTimeout(resolve, 10));
            order.push('task2-end');
        });

        await Promise.all([task1, task2]);

        expect(task2StartedWhileTask1Running).toBe(false);
        expect(order).toEqual([
            'task1-start',
            'task1-end',
            'task2-start',
            'task2-end',
        ]);
    });

    test('should allow tasks on different files to run concurrently', async () => {
        let task1Running = false;
        let concurrent = false;

        const task1 = mutex.withLock('/tmp/file-a.yml', async () => {
            task1Running = true;
            await new Promise((resolve) => setTimeout(resolve, 50));
            task1Running = false;
        });

        const task2 = mutex.withLock('/tmp/file-b.yml', async () => {
            if (task1Running) {
                concurrent = true;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        });

        await Promise.all([task1, task2]);

        expect(concurrent).toBe(true);
    });

    test('should release lock even if task throws an error', async () => {
        const task1 = mutex.withLock('/tmp/docker-compose.yml', async () => {
            throw new Error('Task 1 failed');
        });

        await expect(task1).rejects.toThrow('Task 1 failed');

        let task2Ran = false;
        const task2 = mutex.withLock('/tmp/docker-compose.yml', async () => {
            task2Ran = true;
            return 'success';
        });

        const result = await task2;
        expect(task2Ran).toBe(true);
        expect(result).toBe('success');
    });

    test('isLocked should accurately report lock status', async () => {
        expect(mutex.isLocked('/tmp/docker-compose.yml')).toBe(false);

        let checkDuringLock = false;
        const task = mutex.withLock('/tmp/docker-compose.yml', async () => {
            checkDuringLock = mutex.isLocked('/tmp/docker-compose.yml');
            await new Promise((resolve) => setTimeout(resolve, 20));
        });

        expect(mutex.isLocked('/tmp/docker-compose.yml')).toBe(true);
        await task;

        expect(checkDuringLock).toBe(true);
        expect(mutex.isLocked('/tmp/docker-compose.yml')).toBe(false);
    });

    test('clear should reset all locks', () => {
        mutex.withLock('/tmp/file.yml', async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
        });
        expect(mutex.isLocked('/tmp/file.yml')).toBe(true);
        mutex.clear();
        expect(mutex.isLocked('/tmp/file.yml')).toBe(false);
    });
});
