import { mount } from '@vue/test-utils';
import ConfigurationServerView from '@/views/ConfigurationServerView.vue';
import * as serverService from '@/services/server';
import * as logService from '@/services/log';
import * as storeService from '@/services/store';

jest.mock('@/services/server', () => ({
  getServer: jest.fn(),
  getServerIcon: jest.fn(() => 'mdi-connection'),
}));

jest.mock('@/services/log', () => ({
  getLog: jest.fn(),
  getLogIcon: jest.fn(() => 'mdi-bug'),
}));

jest.mock('@/services/store', () => ({
  getStore: jest.fn(),
  getStoreIcon: jest.fn(() => 'mdi-file-multiple'),
}));

const mockServer = {
  configuration: {
    port: 3000,
    basepath: '/',
    enabled: true,
    feature: {
      delete: true,
    },
    cors: {},
    tls: {},
  },
};

const mockLog = {
  level: 'info',
  format: 'json',
};

const mockStore = {
  configuration: {
    path: '/var/lib/wud/store.json',
  },
};

describe('ConfigurationServerView.vue', () => {
  let mockClipboard: any;

  beforeEach(() => {
    (serverService.getServer as jest.Mock).mockResolvedValue(mockServer);
    (logService.getLog as jest.Mock).mockResolvedValue(mockLog);
    (storeService.getStore as jest.Mock).mockResolvedValue(mockStore);

    mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });
  });

  it('renders all 3 cards with their configuration parameters', async () => {
    const wrapper = mount(ConfigurationServerView);
    await wrapper.setData({
      server: mockServer,
      log: mockLog,
      store: mockStore,
    });

    const vm = wrapper.vm as any;
    expect(vm.cards).toHaveLength(3);

    const serverCard = vm.cards.find((c: any) => c.id === 'server');
    expect(serverCard.items).toHaveLength(6);
    expect(serverCard.items.find((i: any) => i.key === 'feature.delete')?.value).toBe(true);
    expect(serverCard.items.find((i: any) => i.key === 'cors')?.value).toBeNull();
    expect(serverCard.items.find((i: any) => i.key === 'tls')?.value).toBeNull();
    expect(serverCard.items.find((i: any) => i.key === 'basepath')?.value).toBe('/');

    const logCard = vm.cards.find((c: any) => c.id === 'logs');
    expect(logCard.items).toHaveLength(2);

    const storeCard = vm.cards.find((c: any) => c.id === 'store');
    expect(storeCard.items).toHaveLength(1);
  });

  it('filters parameters when search is entered', async () => {
    const wrapper = mount(ConfigurationServerView);
    await wrapper.setData({
      server: mockServer,
      log: mockLog,
      store: mockStore,
    });

    const vm = wrapper.vm as any;
    vm.search = 'port';

    const serverCard = vm.cards.find((c: any) => c.id === 'server');
    expect(serverCard.filteredItems).toHaveLength(1);
    expect(serverCard.filteredItems[0].key).toBe('port');

    const logCard = vm.cards.find((c: any) => c.id === 'logs');
    expect(logCard.filteredItems).toHaveLength(0);
  });

  it('refreshes all configuration items on refreshServer', async () => {
    const wrapper = mount(ConfigurationServerView);
    const vm = wrapper.vm as any;

    await vm.refreshServer();
    expect(serverService.getServer).toHaveBeenCalled();
    expect(logService.getLog).toHaveBeenCalled();
    expect(storeService.getStore).toHaveBeenCalled();
  });

  it('copies value to clipboard and emits notification', async () => {
    const emitMock = jest.fn();
    const wrapper = mount(ConfigurationServerView, {
      global: {
        mocks: {
          $eventBus: {
            emit: emitMock,
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    vm.copyValue('port', 3000);

    expect(mockClipboard.writeText).toHaveBeenCalledWith('3000');
    expect(emitMock).toHaveBeenCalledWith('notify', 'port copied to clipboard');
  });
});
