import { mount } from '@vue/test-utils';
import SnackBar from '@/components/SnackBar.vue';

describe('SnackBar', () => {
  it('renders with default props', () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info',
      },
    });

    expect(wrapper.text()).toContain('Test message');
    expect(wrapper.vm.showLocal).toBe(true);
    expect(wrapper.vm.color).toBe('info');
    expect(wrapper.vm.icon).toBe('mdi-information');
  });

  it('displays different colors and icons for different levels', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'error',
      },
    });

    expect(wrapper.vm.level).toBe('error');
    expect(wrapper.vm.color).toBe('error');
    expect(wrapper.vm.icon).toBe('mdi-alert-circle');

    await wrapper.setProps({ level: 'success' });
    expect(wrapper.vm.level).toBe('success');
    expect(wrapper.vm.color).toBe('success');
    expect(wrapper.vm.icon).toBe('mdi-check-circle');

    await wrapper.setProps({ level: 'warning' });
    expect(wrapper.vm.level).toBe('warning');
    expect(wrapper.vm.color).toBe('warning');
    expect(wrapper.vm.icon).toBe('mdi-alert');

    await wrapper.setProps({ level: 'info' });
    expect(wrapper.vm.level).toBe('info');
    expect(wrapper.vm.color).toBe('info');
    expect(wrapper.vm.icon).toBe('mdi-information');

    // Default fallback for unknown level
    await wrapper.setProps({ level: 'unknown' });
    expect(wrapper.vm.color).toBe('info');
    expect(wrapper.vm.icon).toBe('mdi-information');
  });

  it('emits close event when snackbar is closed directly or via close button', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info',
      },
    });

    const closeBtn = wrapper.find('.close-button');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');

    expect(wrapper.vm.$eventBus.emit).toHaveBeenCalledWith('notify:close');
  });

  it('updates local show state when prop changes and emits close on false', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: false,
        level: 'info',
      },
    });

    expect(wrapper.vm.showLocal).toBe(false);

    await wrapper.setProps({ show: true });
    expect(wrapper.vm.showLocal).toBe(true);

    wrapper.vm.showLocal = false;
    expect(wrapper.vm.$eventBus.emit).toHaveBeenCalledWith('notify:close');
  });

  it('handles timeout correctly', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info',
        timeout: 5000,
      },
    });

    expect(wrapper.vm.timeout).toBe(5000);
  });

  it('positions snackbar at top right', () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info',
      },
    });

    const snackbar = wrapper.find('.v-snackbar');
    expect(snackbar.exists()).toBe(true);
    expect(snackbar.attributes('data-location')).toBe('top right');
  });
});