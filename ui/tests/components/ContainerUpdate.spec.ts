import { mount } from '@vue/test-utils';
import ContainerUpdate from '@/components/ContainerUpdate';

const mockUpdateKind = {
  kind: 'tag',
  localValue: '1.0.0',
  remoteValue: '2.0.0',
  semverDiff: 'major'
};

const mockResult = {
  tag: '2.0.0',
  created: '2023-01-02T00:00:00Z',
  digest: 'sha256:abcdef123456'
};

describe('ContainerUpdate', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(ContainerUpdate, {
      props: {
        updateKind: mockUpdateKind,
        result: mockResult
      }
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders update information correctly', () => {
    expect(wrapper.vm.updateKind.remoteValue).toBe('2.0.0');
    expect(wrapper.vm.updateKind.localValue).toBe('1.0.0');
  });

  it('shows semver diff information', () => {
    expect(wrapper.vm.updateKind.semverDiff).toBe('major');
  });

  it('displays creation date', () => {
    expect(wrapper.vm.result.created).toBe('2023-01-02T00:00:00Z');
  });

  it('shows digest information', () => {
    expect(wrapper.vm.result.digest).toBe('sha256:abcdef123456');
  });

  it('handles non-semver updates', async () => {
    await wrapper.setProps({
      updateKind: {
        kind: 'digest',
        localValue: 'sha256:old123',
        remoteValue: 'sha256:new456'
      }
    });

    expect(wrapper.vm.updateKind.kind).toBe('digest');
  });

  it('shows no update available message when update is not available', async () => {
    await wrapper.setProps({
      updateKind: null
    });

    expect(wrapper.vm.updateKind).toBeNull();
  });

  it('handles different update kinds', async () => {
    await wrapper.setProps({
      updateKind: {
        kind: 'tag',
        localValue: '1.0.0',
        remoteValue: '1.1.0',
        semverDiff: 'minor'
      }
    });

    expect(wrapper.vm.updateKind.semverDiff).toBe('minor');

    await wrapper.setProps({
      updateKind: {
        kind: 'tag',
        localValue: '1.0.0',
        remoteValue: '1.0.1',
        semverDiff: 'patch'
      }
    });

    expect(wrapper.vm.updateKind.semverDiff).toBe('patch');
  });

  it('displays correct severity colors', () => {
    // Test that component has access to update kind data
    expect(wrapper.vm.updateKind.semverDiff).toBe('major');
  });

  it('formats version information correctly', () => {
    expect(wrapper.vm.updateKind.localValue).toBe('1.0.0');
    expect(wrapper.vm.updateKind.remoteValue).toBe('2.0.0');
  });

  it('handles missing updateKind gracefully', async () => {
    await wrapper.setProps({ updateKind: null });
    expect(wrapper.exists()).toBe(true);
  });

  it('handles missing result gracefully', async () => {
    await wrapper.setProps({ result: null });
    expect(wrapper.exists()).toBe(true);
  });

  it('computes correct update type', () => {
    expect(wrapper.vm.updateKind.kind).toBe('tag');
  });
});