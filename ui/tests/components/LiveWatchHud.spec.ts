import { mount } from '@vue/test-utils';
import LiveWatchHud from '../../src/components/LiveWatchHud.vue';
import { eventService } from '../../src/services/event';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const emitEvent = (type: string, data: any) => {
  const handlers = (eventService as any).handlers[type];
  if (handlers) {
    handlers.forEach((cb: any) => cb(data));
  }
};

describe('LiveWatchHud.vue', () => {
  let vuetify: any;

  beforeEach(() => {
    vuetify = createVuetify({ components, directives });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('displays progress for a single watcher', async () => {
    const wrapper = mount(LiveWatchHud, {
      global: { plugins: [vuetify] }
    });

    // Should not be visible initially
    expect(wrapper.find('.live-watch-hud').exists()).toBe(false);

    // Emit start
    emitEvent('wud:watch-start', { watcher: 'docker.local', total: 5 });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.live-watch-hud').exists()).toBe(true);
    expect(wrapper.text()).toContain('0 / 5');

    // Emit progress
    emitEvent('wud:watch-progress', { 
      watcher: 'docker.local', 
      processed: 2, 
      total: 5, 
      container: { name: 'redis' } 
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('2 / 5');
    expect(wrapper.text()).toContain('Inspecting: redis (docker.local)');

    // Emit stop
    emitEvent('wud:watch-stop', { watcher: 'docker.local', processed: 5, total: 5 });
    await wrapper.vm.$nextTick();
    
    // HUD should still be visible until timeout
    expect(wrapper.find('.live-watch-hud').exists()).toBe(true);

    // Fast-forward timeout
    jest.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    
    // HUD should disappear
    expect(wrapper.find('.live-watch-hud').exists()).toBe(false);
  });

  it('aggregates progress across multiple watchers', async () => {
    const wrapper = mount(LiveWatchHud, {
      global: { plugins: [vuetify] }
    });

    // Start 2 watchers
    emitEvent('wud:watch-start', { watcher: 'w1', total: 10 });
    emitEvent('wud:watch-start', { watcher: 'w2', total: 20 });
    await wrapper.vm.$nextTick();
    
    // Total should be 30
    expect(wrapper.text()).toContain('0 / 30');

    // Progress w1
    emitEvent('wud:watch-progress', { 
      watcher: 'w1', processed: 5, total: 10, container: { name: 'c1' } 
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('5 / 30');
    expect(wrapper.text()).toContain('Inspecting: c1 (w1)');

    // Progress w2
    emitEvent('wud:watch-progress', { 
      watcher: 'w2', processed: 10, total: 20, container: { name: 'c2' } 
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('15 / 30'); // 5 from w1 + 10 from w2
    expect(wrapper.text()).toContain('Inspecting: c2 (w2)');

    // Stop w1
    emitEvent('wud:watch-stop', { watcher: 'w1', processed: 10, total: 10 });
    await wrapper.vm.$nextTick();
    
    // Total should still be 30, processed 20
    expect(wrapper.text()).toContain('20 / 30');
    
    // Advance timers (should not close HUD because w2 is still active)
    jest.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.live-watch-hud').exists()).toBe(true);

    // Stop w2
    emitEvent('wud:watch-stop', { watcher: 'w2', processed: 20, total: 20 });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('30 / 30');

    // Advance timers (should now close HUD)
    jest.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.live-watch-hud').exists()).toBe(false);
  });
});
