import { mount } from '@vue/test-utils';
import ContainerError from '@/components/ContainerError';

const mockError = {
  message: 'Test error message',
  code: 500
};

describe('ContainerError', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(ContainerError, {
      props: {
        error: mockError
      }
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('renders error message', () => {
    expect(wrapper.text()).toContain('Test error message');
  });

  it('displays error code if provided', () => {
    expect(wrapper.vm.error.code).toBe(500);
  });

  it('handles missing error message', async () => {
    await wrapper.setProps({ error: {} });
    expect(wrapper.exists()).toBe(true);
  });
});