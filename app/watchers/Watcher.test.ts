import Watcher from './Watcher';
import { Container } from '../model/container';

class TestWatcher extends Watcher {
    check = jest.fn();
    async watch() {
        return [];
    }
    async getContainers() {
        return [];
    }
    protected async checkContainer(container: Container) {
        return this.check(container);
    }
}
const container = (id: string) => ({ id }) as Container;
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test('serializes manual and batch checks for the same container', async () => {
    const watcher = new TestWatcher();
    let release: () => void;
    watcher.check
        .mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }),
        )
        .mockResolvedValue({});
    const first = watcher.watchContainer(container('one'));
    const batch = watcher.processWatchContainers([container('one')]);
    await tick();
    expect(watcher.check).toHaveBeenCalledTimes(1);
    release!();
    await Promise.all([first, batch]);
    expect(watcher.check).toHaveBeenCalledTimes(2);
});

test('different containers and watcher instances can check concurrently', async () => {
    const first = new TestWatcher();
    const second = new TestWatcher();
    let release: () => void;
    first.check
        .mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }),
        )
        .mockResolvedValue({});
    second.check.mockResolvedValue({});
    const pending = first.watchContainer(container('one'));
    await Promise.all([
        first.watchContainer(container('two')),
        second.watchContainer(container('one')),
    ]);
    expect(first.check).toHaveBeenCalledTimes(2);
    expect(second.check).toHaveBeenCalledTimes(1);
    release!();
    await pending;
});

test('a failed check releases the container lock for queued and subsequent checks', async () => {
    const watcher = new TestWatcher();
    watcher.check
        .mockRejectedValueOnce(new Error('failed'))
        .mockResolvedValue({});
    const failed = watcher.watchContainer(container('one'));
    const next = watcher.watchContainer(container('one'));
    await expect(failed).rejects.toThrow('failed');
    await expect(next).resolves.toEqual({});
    await expect(watcher.watchContainer(container('one'))).resolves.toEqual({});
});
