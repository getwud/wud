// @ts-nocheck
import {
    HealthVerdict,
    buildSampleSchedule,
    smokeTest,
    waitForHealthy,
} from './health';

const log = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

describe('buildSampleSchedule', () => {
    test('should return two samples when grace equals interval', () => {
        expect(buildSampleSchedule(10000, 10000, 0)).toEqual([0, 10000]);
    });

    test('should sample every interval and close exactly at the deadline', () => {
        expect(buildSampleSchedule(10000, 4000, 0)).toEqual([
            0, 4000, 8000, 10000,
        ]);
    });
});

describe('waitForHealthy', () => {
    test('should return healthy when the container reports healthy', async () => {
        const container = {
            inspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'healthy' } },
                }),
        };
        const verdict: HealthVerdict = await waitForHealthy(
            container,
            { window: 5000, interval: 10 },
            log,
        );
        expect(verdict).toEqual('healthy');
    });

    test('should return unhealthy when the container reports unhealthy', async () => {
        const container = {
            inspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'unhealthy' } },
                }),
        };
        expect(
            await waitForHealthy(
                container,
                { window: 5000, interval: 10 },
                log,
            ),
        ).toEqual('unhealthy');
    });

    test('should return crashed when the container is not running', async () => {
        const container = {
            inspect: () => Promise.resolve({ State: { Running: false } }),
        };
        expect(
            await waitForHealthy(
                container,
                { window: 5000, interval: 10 },
                log,
            ),
        ).toEqual('crashed');
    });

    test('should return timeout when the health status never settles', async () => {
        const container = {
            inspect: () =>
                Promise.resolve({
                    State: { Running: true, Health: { Status: 'starting' } },
                }),
        };
        expect(
            await waitForHealthy(container, { window: 20, interval: 5 }, log),
        ).toEqual('timeout');
    });

    test('should return no-healthcheck immediately without waiting the whole window', async () => {
        const container = {
            inspect: () => Promise.resolve({ State: { Running: true } }),
        };
        const start = Date.now();
        const verdict = await waitForHealthy(
            container,
            { window: 60000, interval: 10 },
            log,
        );
        expect(verdict).toEqual('no-healthcheck');
        expect(Date.now() - start).toBeLessThan(1000);
    });

    test('should tolerate a transient inspect error then recover', async () => {
        let call = 0;
        const container = {
            inspect: () => {
                call += 1;
                if (call === 1) {
                    return Promise.reject(new Error('transient'));
                }
                return Promise.resolve({
                    State: { Running: true, Health: { Status: 'healthy' } },
                });
            },
        };
        expect(
            await waitForHealthy(container, { window: 5000, interval: 5 }, log),
        ).toEqual('healthy');
        expect(call).toBeGreaterThanOrEqual(2);
    });

    test('should return timeout when inspection fails persistently', async () => {
        const container = {
            inspect: () => Promise.reject(new Error('engine unreachable')),
        };
        expect(
            await waitForHealthy(container, { window: 20, interval: 5 }, log),
        ).toEqual('timeout');
    });
});

describe('smokeTest', () => {
    test('should return healthy when the container stays up through grace', async () => {
        const container = {
            inspect: () => Promise.resolve({ State: { Running: true } }),
        };
        expect(
            await smokeTest(container, { grace: 30, interval: 10 }, log),
        ).toEqual('healthy');
    });

    test('should return crashed when an observed sample reports an exit', async () => {
        let call = 0;
        const container = {
            inspect: () => {
                call += 1;
                return Promise.resolve({ State: { Running: call < 2 } });
            },
        };
        expect(
            await smokeTest(container, { grace: 30, interval: 10 }, log),
        ).toEqual('crashed');
    });

    test('should return crashed when the container is never inspectable', async () => {
        const container = {
            inspect: () => Promise.reject(new Error('engine unreachable')),
        };
        expect(
            await smokeTest(container, { grace: 20, interval: 5 }, log),
        ).toEqual('crashed');
    });

    test('case (i): first sample transient error then running => healthy (no rollback)', async () => {
        let call = 0;
        const container = {
            inspect: () => {
                call += 1;
                if (call === 1) {
                    return Promise.reject(new Error('transient'));
                }
                return Promise.resolve({ State: { Running: true } });
            },
        };
        expect(
            await smokeTest(container, { grace: 20, interval: 10 }, log),
        ).toEqual('healthy');
    });

    test('case (ii): every sample fails through grace => crashed (rollback)', async () => {
        let call = 0;
        const container = {
            inspect: () => {
                call += 1;
                return Promise.reject(new Error('persistent'));
            },
        };
        expect(
            await smokeTest(container, { grace: 20, interval: 10 }, log),
        ).toEqual('crashed');
        expect(call).toBeGreaterThanOrEqual(2);
    });

    test('case (iii): exit on the closing sample => crashed', async () => {
        let call = 0;
        const container = {
            inspect: () => {
                call += 1;
                // running on the immediate sample, exited on the closing one
                return Promise.resolve({ State: { Running: call === 1 } });
            },
        };
        expect(
            await smokeTest(container, { grace: 20, interval: 20 }, log),
        ).toEqual('crashed');
    });
});
