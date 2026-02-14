import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';

// Create a Vuetify instance for testing
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light'
  }
});

// Mock global properties
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockFilters = {
  date: jest.fn((date) => new Date(date).toLocaleDateString()),
  dateTime: jest.fn((date) => new Date(date).toLocaleString()),
  short: jest.fn((str, length) => str?.substring(0, length) + '...')
};

// Mock router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  back: jest.fn(),
  forward: jest.fn()
};

// Global test configuration
config.global.mocks = {
  $eventBus: mockEventBus,
  $filters: mockFilters,
  $serverConfig: {
    feature: {
      delete: true
    }
  },
  $router: mockRouter,
  $route: {
    name: 'test',
    path: '/test',
    query: {},
    params: {}
  },
  $vuetify: {
    theme: {
      current: {
        dark: false
      }
    },
    display: {
      xs: false,
      sm: false,
      md: true,
      lg: false,
      xl: false,
      xxl: false,
      smAndUp: true,
      mdAndUp: true,
      lgAndUp: false,
      xlAndUp: false,
      smAndDown: false,
      mdAndDown: true,
      lgAndDown: true,
      xlAndDown: true
    }
  }
};

// Mock fetch globally
global.fetch = jest.fn();
(global.fetch as any).mockResolvedValue = jest.fn();
(global.fetch as any).mockResolvedValueOnce = jest.fn();
(global.fetch as any).mockRejectedValue = jest.fn();
(global.fetch as any).mockRejectedValueOnce = jest.fn();
(global.fetch as any).mockClear = jest.fn();


// Mock Vuetify components with templates
config.global.stubs = {
  'v-img': { template: '<div class="v-img"><slot /></div>' },
  'v-avatar': { template: '<div class="v-avatar"><slot /></div>' },
  'v-app': { template: '<div class="v-app"><slot /></div>' },
  'v-main': { template: '<div class="v-main"><slot /></div>' },
  'v-container': { template: '<div class="v-container"><slot /></div>' },
  'v-row': { template: '<div class="v-row"><slot /></div>' },
  'v-col': { template: '<div class="v-col"><slot /></div>' },
  'v-card': { template: '<div class="v-card"><slot /></div>' },
  'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
  'v-card-subtitle': { template: '<div class="v-card-subtitle"><slot /></div>' },
  'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
  'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
  'v-btn': { 
    template: '<button class="v-btn" :to="to" :disabled="disabled" :type="type" @click="$emit(\'click\')"><slot /></button>', 
    props: ['disabled', 'type', 'to', 'color'],
    emits: ['click'],
    name: 'v-btn'
  },
  'v-icon': { template: '<i class="v-icon"><slot /></i>' },
  'v-chip': { template: '<span class="v-chip"><slot /></span>' },
  'v-select': { 
    template: '<select class="v-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>', 
    props: ['modelValue', 'items'],
    emits: ['update:modelValue']
  },
  'v-autocomplete': { 
    template: '<input class="v-autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', 
    props: ['modelValue'],
    emits: ['update:modelValue']
  },
  'v-switch': { 
    template: '<input type="checkbox" class="v-switch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', 
    props: ['modelValue'],
    emits: ['update:modelValue']
  },
  'v-text-field': { 
    template: '<input class="v-text-field" :type="type" :autocomplete="autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', 
    props: ['type', 'autocomplete', 'modelValue'],
    emits: ['update:modelValue']
  },
  'v-snackbar': { 
    template: '<div class="v-snackbar" v-if="modelValue"><slot />{{ text }}<button v-if="$slots.action || closable" data-testid="close-button" @click="$emit(\'update:modelValue\', false)">Close</button></div>', 
    props: ['modelValue', 'timeout', 'color', 'text', 'closable'],
    emits: ['update:modelValue']
  },
  'v-tabs': { template: '<div class="v-tabs"><slot /></div>' },
  'v-tab': { template: '<button class="v-tab"><slot /></button>' },
  'v-window': { template: '<div class="v-window"><slot /></div>' },
  'v-window-item': { template: '<div class="v-window-item"><slot /></div>' },
  'v-dialog': { template: '<div class="v-dialog"><slot /></div>' },
  'v-divider': { template: '<div class="v-divider"></div>' },
  'v-spacer': { template: '<div class="v-spacer"></div>' },
  'v-tooltip': { template: '<div class="v-tooltip"><slot /></div>' },
  'v-form': { template: '<form class="v-form" @keyup.enter="() => {}"><slot /></form>' },
  'v-list': { template: '<div class="v-list"><slot /></div>' },
  'v-list-item': { template: '<div class="v-list-item"><slot /></div>' },
  'v-list-item-title': { template: '<div class="v-list-item-title"><slot /></div>' },
  'v-list-item-subtitle': { template: '<div class="v-list-item-subtitle"><slot /></div>' },
  'v-toolbar-title': { template: '<div class="v-toolbar-title"><slot /></div>' },
  'v-app-bar': { template: '<div class="v-app-bar"><slot /></div>' },
  'v-app-bar-nav-icon': { template: '<button class="v-app-bar-nav-icon" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
  'v-navigation-drawer': { template: '<div class="v-navigation-drawer"><slot /></div>' },
  'v-toolbar': { template: '<div class="v-toolbar"><slot /></div>' },
  'v-footer': { template: '<footer class="v-footer"><slot /></footer>' },
  'v-menu': { template: '<div class="v-menu"><slot name="activator" :props="{}" /><slot /></div>' },
  'container-filter': {  
    template: '<div class="container-filter">Watcher Registry Update kind Group by label</div>',
    name: 'container-filter'
  },
  'container-item': { template: '<div class="container-item"><slot /></div>' },
  'container-image': { template: '<div class="container-image"><slot /></div>' },
  'container-detail': { template: '<div class="container-detail"><slot /></div>' },
  'container-update': { template: '<div class="container-update"><slot /></div>' },
  'container-triggers': { template: '<div class="container-triggers"><slot /></div>' },
  'IconRenderer': { template: '<div class="icon-renderer"><slot /></div>' }
};

// Global plugins
config.global.plugins = [vuetify];

// Mock display composable and Vue Router
config.global.provide = {
  'Symbol(vuetify:display)': {
    xs: false,
    sm: false,
    md: true,
    lg: false,
    xl: false,
    xxl: false,
    smAndUp: true,
    mdAndUp: true,
    lgAndUp: false,
    xlAndUp: false,
    smAndDown: false,
    mdAndDown: true,
    lgAndDown: true,
    xlAndDown: true
  },
  'Symbol(route location)': {
    name: 'test',
    path: '/test',
    query: {},
    params: {}
  },
  'Symbol(router)': {
    push: jest.fn(),
    replace: jest.fn(),
    go: jest.fn(),
    back: jest.fn(),
    forward: jest.fn()
  }
};