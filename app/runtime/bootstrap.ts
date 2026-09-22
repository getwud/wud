/**
 * WUD bootstrap orchestrator.
 * Two modes:
 * - server: full startup (store -> auth -> prometheus -> registry -> api).
 * - oneshot: components registration only (no store, no auth, no server).
 */
import * as registry from '../registry';
import { RunMode } from './mode';

/**
 * Bootstrap WUD for the given run mode.
 * In one-shot mode the store is never initialized and no background task
 * (cron, watch at start, docker events, signal handlers, HTTP server) runs.
 */
export async function bootstrap(options: { mode: RunMode }) {
    if (options.mode === 'oneshot') {
        await registry.registerComponents();
        return;
    }

    // Server startup order (preserved from the legacy main):
    // store.init -> bootstrapAuth -> prometheus.init -> registry.init -> api.init
    const store = await import('../store');
    const { bootstrapAuth } = await import('../store/auth_bootstrap');
    const prometheus = await import('../prometheus');
    const api = await import('../api');

    await store.store.init();
    await bootstrapAuth();
    prometheus.init();
    await registry.init();
    await api.init();
}
