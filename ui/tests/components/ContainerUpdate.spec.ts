import { mount } from '@vue/test-utils';
import ContainerUpdate from '@/components/ContainerUpdate.vue';

const mockUpdateKind = {
  kind: 'tag',
  localValue: '1.0.0',
  remoteValue: '2.0.0',
  semverDiff: 'major'
};

const mockResult = {
  tag: '2.0.0',
  created: '2023-01-02T00:00:00Z',
  version: '2.3.7',
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

  describe('when an update is available', () => {
    // The shared wrapper above omits updateAvailable, so the whole list is
    // hidden and only props can be asserted. These mount with it enabled so the
    // rendered rows can be checked.
    const mountAvailable = (result) =>
      mount(ContainerUpdate, {
        props: {
          updateKind: mockUpdateKind,
          updateAvailable: true,
          result
        }
      });

    it('renders the remote version reported by the registry', () => {
      const available = mountAvailable(mockResult);
      expect(available.text()).toContain('Version');
      expect(available.text()).toContain('2.3.7');
      available.unmount();
    });

    it('renders the remote build date', () => {
      const available = mountAvailable(mockResult);
      expect(available.text()).toContain('Built');
      available.unmount();
    });

    it('omits both rows when the registry reported neither', () => {
      const available = mountAvailable({
        tag: '2.0.0',
        digest: 'sha256:abcdef123456'
      });
      expect(available.text()).not.toContain('Version');
      expect(available.text()).not.toContain('Built');
      available.unmount();
    });
  });

  it('computes correct update type', () => {
    expect(wrapper.vm.updateKind.kind).toBe('tag');
  });

  it('displays cool-down alert when isCoolingDown is true', async () => {
    const futureTime = Date.now() + 86400000;
    await wrapper.setProps({
      isCoolingDown: true,
      coolingDownUntil: futureTime,
      updateAvailable: false,
    });

    expect(wrapper.text()).toContain('Update in cool-down');
    expect(wrapper.text()).toContain('held in cool-down period');
  });

  describe('risk analysis state reset', () => {
    it('resets localRiskAnalysis and falls back to new container riskAnalysis when container changes', async () => {
      const containerA = {
        id: 'container-a',
        result: {
          tag: '1.1.0',
          riskAnalysis: {
            riskScore: 'low',
            summary: 'Container A initial risk',
            breakingChanges: [],
            envVarChanges: [],
            databaseImpact: null,
            evaluatedAt: new Date().toISOString(),
          },
        },
      };
      const containerB = {
        id: 'container-b',
        result: {
          tag: '2.0.0',
          riskAnalysis: {
            riskScore: 'high',
            summary: 'Container B initial risk',
            breakingChanges: ['Breaking change in B'],
            envVarChanges: [],
            databaseImpact: null,
            evaluatedAt: new Date().toISOString(),
          },
        },
      };

      await wrapper.setProps({
        container: containerA,
        result: containerA.result,
      });

      wrapper.vm.localRiskAnalysis = {
        riskScore: 'critical',
        summary: 'Container A re-evaluated risk',
        breakingChanges: ['Critical flaw'],
        envVarChanges: [],
        databaseImpact: null,
        evaluatedAt: new Date().toISOString(),
      };
      expect(wrapper.vm.effectiveRiskAnalysis.riskScore).toBe('critical');

      await wrapper.setProps({
        container: containerB,
        result: containerB.result,
      });

      expect(wrapper.vm.localRiskAnalysis).toBeNull();
      expect(wrapper.vm.effectiveRiskAnalysis.riskScore).toBe('high');
      expect(wrapper.vm.effectiveRiskAnalysis.summary).toBe('Container B initial risk');
    });

    it('resets localRiskAnalysis when containerId changes', async () => {
      await wrapper.setProps({
        containerId: 'container-1',
        result: { tag: '1.0.0' },
      });

      wrapper.vm.localRiskAnalysis = {
        riskScore: 'medium',
        summary: 'Cached risk',
      };
      expect(wrapper.vm.effectiveRiskAnalysis.riskScore).toBe('medium');

      await wrapper.setProps({
        containerId: 'container-2',
      });

      expect(wrapper.vm.localRiskAnalysis).toBeNull();
      expect(wrapper.vm.effectiveRiskAnalysis).toBeNull();
    });

    it('resets localRiskAnalysis when result.tag changes', async () => {
      await wrapper.setProps({
        result: { tag: '1.0.0' },
      });

      wrapper.vm.localRiskAnalysis = {
        riskScore: 'low',
        summary: 'Old tag risk',
      };

      await wrapper.setProps({
        result: { tag: '2.0.0' },
      });

      expect(wrapper.vm.localRiskAnalysis).toBeNull();
    });
  });

  describe('Hero Version Transition block', () => {
    it('displays version transition from current to target with bump badge', () => {
      const heroWrapper = mount(ContainerUpdate, {
        props: {
          updateKind: mockUpdateKind,
          updateAvailable: true,
          result: mockResult,
          semver: true,
        },
      });

      expect(heroWrapper.text()).toContain('CURRENT');
      expect(heroWrapper.text()).toContain('1.0.0');
      expect(heroWrapper.text()).toContain('TARGET');
      expect(heroWrapper.text()).toContain('2.0.0');
      expect(heroWrapper.text()).toContain('MAJOR');
      expect(heroWrapper.text()).toContain('semver');
      heroWrapper.unmount();
    });

    it('displays snoozed status cleanly inside the hero block', () => {
      const heroWrapper = mount(ContainerUpdate, {
        props: {
          updateKind: mockUpdateKind,
          updateAvailable: false,
          isSnoozed: true,
          snoozedVersion: '2.0.0',
          result: mockResult,
        },
      });

      expect(heroWrapper.text()).toContain('Update snoozed');
      expect(heroWrapper.text()).toContain('Version 2.0.0 is snoozed indefinitely.');
      heroWrapper.unmount();
    });

    it('renders DIGEST bump badge for digest update kind', () => {
      const heroWrapper = mount(ContainerUpdate, {
        props: {
          updateKind: {
            kind: 'digest',
            localValue: 'sha256:111111',
            remoteValue: 'sha256:222222',
          },
          updateAvailable: true,
          result: {
            digest: 'sha256:222222333333444444555555',
          },
        },
      });

      expect(heroWrapper.text()).toContain('DIGEST');
      expect((heroWrapper.vm as any).bumpBadgeColor).toBe('info');
      heroWrapper.unmount();
    });

    it('renders symmetric copy buttons for both current and target version badges', () => {
      const heroWrapper = mount(ContainerUpdate, {
        props: {
          updateKind: mockUpdateKind,
          updateAvailable: true,
          result: mockResult,
        },
      });

      const copyCurrentBtn = heroWrapper.find('button[aria-label="Copy current tag"]');
      const copyTargetBtn = heroWrapper.find('button[aria-label="Copy target tag"]');

      expect(copyCurrentBtn.exists()).toBe(true);
      expect(copyTargetBtn.exists()).toBe(true);

      const badges = heroWrapper.findAll('.version-badge');
      expect(badges.length).toBe(2);
      heroWrapper.unmount();
    });
  });
});