import { mount } from '@vue/test-utils';
import HomeView from '@/views/HomeView';

// Mock services
jest.mock('@/services/container', () => ({
  getContainerIcon: jest.fn(() => 'mdi-docker'),
  getAllContainers: jest.fn(() => Promise.resolve([
    { id: 1, updateAvailable: true },
    { id: 2, updateAvailable: false }
  ]))
}));
jest.mock('@/services/registry', () => ({
  getRegistryIcon: jest.fn(() => 'mdi-database'),
  getAllRegistries: jest.fn(() => Promise.resolve([{}, {}, {}]))
}));
jest.mock('@/services/trigger', () => ({
  getTriggerIcon: jest.fn(() => 'mdi-bell'),
  getAllTriggers: jest.fn(() => Promise.resolve([{}]))
}));
jest.mock('@/services/watcher', () => ({
  getWatcherIcon: jest.fn(() => 'mdi-eye'),
  getAllWatchers: jest.fn(() => Promise.resolve([{}, {}]))
}));

describe('HomeView', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = mount(HomeView, {
      global: {
        stubs: {
          'v-btn': {
            template: '<button class="v-btn-stub" :data-to="to"><slot /></button>',
            props: ['to']
          }
        }
      }
    });
    
    // Simulate data loaded from beforeRouteEnter
    await wrapper.setData({
      containersCount: 2,
      containersToUpdateCount: 1,
      triggersCount: 1,
      watchersCount: 2,
      registriesCount: 3,
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders all status cards', () => {
    const cards = wrapper.findAll('.home-card');
    expect(cards).toHaveLength(4);
  });

  it('displays correct counts', () => {
    expect(wrapper.text()).toContain('2 containers');
    expect(wrapper.text()).toContain('1 triggers');
    expect(wrapper.text()).toContain('2 watchers');
    expect(wrapper.text()).toContain('3 registries');
  });

  it('displays update warning when updates are available', () => {
    expect(wrapper.text()).toContain('1 updates available');
    const updateBtn = wrapper.findAll('.v-btn-stub').find(w => w.text().includes('updates available'));
    expect(updateBtn.attributes('style')).not.toContain('pointer-events: none');
  });

  it('displays success message when no updates are available', async () => {
    await wrapper.setData({
      containersToUpdateCount: 0
    });
    expect(wrapper.text()).toContain('all containers are up-to-date');
    const updateBtn = wrapper.findAll('.v-btn-stub').find(w => w.text().includes('up-to-date'));
    expect(updateBtn.attributes('style')).toContain('pointer-events: none');
  });
  
  it('navigates to correct routes', () => {
      // Find all v-btn stubs
      const links = wrapper.findAll('.v-btn-stub');
      
      const paths = links.map(w => w.attributes('data-to')).filter(Boolean);
      
      expect(paths).toContain('/containers');
      expect(paths).toContain('/containers?update-available=true');
      expect(paths).toContain('/configuration/triggers');
      expect(paths).toContain('/configuration/watchers');
      expect(paths).toContain('/configuration/registries');
  });
});

// Separate test block for the route hook logic if needed
describe('HomeView Route Hook', () => {
    it('fetches data on beforeRouteEnter', async () => {
        const next = jest.fn();
        const from = {};
        const to = {};
        
        await HomeView.beforeRouteEnter.call(HomeView, to, from, next);
        
        // Check if next was called with a callback
        expect(next).toHaveBeenCalledWith(expect.any(Function));
        
        // Simulate the callback execution
        const vm = {
            containersCount: 0,
            triggersCount: 0,
            watchersCount: 0,
            registriesCount: 0,
            containersToUpdateCount: 0
        };
        const callback = next.mock.calls[0][0];
        callback(vm);
        
        expect(vm.containersCount).toBe(2);
        expect(vm.registriesCount).toBe(3);
    });
});