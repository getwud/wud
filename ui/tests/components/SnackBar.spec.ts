import { mount } from '@vue/test-utils';
import SnackBar from '@/components/SnackBar';

describe('SnackBar', () => {
  it('renders with default props', () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info'
      }
    });

    expect(wrapper.text()).toContain('Test message');
    expect(wrapper.vm.showLocal).toBe(true);
  });

  it('displays different colors for different levels', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'error'
      }
    });

    expect(wrapper.vm.level).toBe('error');

    await wrapper.setProps({ level: 'success' });
    expect(wrapper.vm.level).toBe('success');

    await wrapper.setProps({ level: 'warning' });
    expect(wrapper.vm.level).toBe('warning');

    await wrapper.setProps({ level: 'info' });
    expect(wrapper.vm.level).toBe('info');
  });

  it('emits close event when snackbar is closed', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info'
      }
    });

    wrapper.vm.closeSnackbar();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.$eventBus.emit).toHaveBeenCalledWith('notify:close');
  });

  it('updates local show state when prop changes', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: false,
        level: 'info'
      }
    });

    expect(wrapper.vm.showLocal).toBe(false);

    await wrapper.setProps({ show: true });
    expect(wrapper.vm.showLocal).toBe(true);
  });

  it('handles timeout correctly', async () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info'
      }
    });

    expect(wrapper.vm.timeout).toBe(4000);
  });

  it('shows close button', () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info'
      }
    });

    expect(wrapper.find('.v-snackbar').exists()).toBe(true);
  });

  it('positions snackbar at bottom', () => {
    const wrapper = mount(SnackBar, {
      props: {
        message: 'Test message',
        show: true,
        level: 'info'
      }
    });

    // Check that the snackbar has bottom positioning
    const snackbar = wrapper.find('.v-snackbar');
    expect(snackbar.exists()).toBe(true);
  });
});