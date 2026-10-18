import { mount } from "@vue/test-utils";
import UpgradeTimeline from "@/components/UpgradeTimeline.vue";
import { IntermediateReleaseItem } from "@/services/hub";

describe("UpgradeTimeline.vue", () => {
  it("renders empty message when no releases are provided", () => {
    const wrapper = mount(UpgradeTimeline, {
      props: {
        releases: [],
      },
    });

    expect(wrapper.text()).toContain("No intermediate release details available.");
  });

  it("renders releases with tags, summaries, breaking changes, and initial Current Version node", () => {
    const releases: IntermediateReleaseItem[] = [
      {
        tag: "7.2.0",
        name: "Redis 7.2.0",
        publishedAt: "2023-08-15T00:00:00.000Z",
        isTarget: false,
        summary: "Major release with protocol updates",
        breakingChanges: ["RESP3 protocol enabled by default"],
        url: "https://github.com/redis/redis/releases/tag/7.2.0",
      },
      {
        tag: "7.2.4",
        name: "Redis 7.2.4",
        publishedAt: "2024-01-10T00:00:00.000Z",
        isTarget: true,
        summary: "Security release",
        breakingChanges: [],
        url: "https://github.com/redis/redis/releases/tag/7.2.4",
      },
    ];

    const wrapper = mount(UpgradeTimeline, {
      props: {
        releases,
        currentTag: "7.0.15",
        targetTag: "7.2.4",
      },
    });

    // Starting node
    expect(wrapper.text()).toContain("7.0.15");
    expect(wrapper.text()).toContain("Currently running version");
    expect(wrapper.text()).toContain("Current Version");

    // Intermediate release
    expect(wrapper.text()).toContain("7.2.0");
    expect(wrapper.text()).toContain("Redis 7.2.0");
    expect(wrapper.text()).toContain("Major release with protocol updates");
    expect(wrapper.text()).toContain("1 breaking");
    expect(wrapper.text()).toContain("RESP3 protocol enabled by default");

    // Target release
    expect(wrapper.text()).toContain("7.2.4");
    expect(wrapper.text()).toContain("Target Version");
    expect(wrapper.text()).toContain("Security release");
  });

  it("calculates dot colors and icons accurately", () => {
    const wrapper = mount(UpgradeTimeline);
    const vm = wrapper.vm as any;

    const targetRelease: IntermediateReleaseItem = {
      tag: "1.2.0",
      isTarget: true,
      breakingChanges: [],
    };
    expect(vm.getDotColor(targetRelease)).toBe("primary");
    expect(vm.getDotIcon(targetRelease)).toBe("mdi-flag-checkered");

    const breakingRelease: IntermediateReleaseItem = {
      tag: "1.1.0",
      isTarget: false,
      breakingChanges: ["Something broken"],
    };
    expect(vm.getDotColor(breakingRelease)).toBe("error");
    expect(vm.getDotIcon(breakingRelease)).toBe("mdi-alert-octagon");

    const normalRelease: IntermediateReleaseItem = {
      tag: "1.0.1",
      isTarget: false,
      breakingChanges: [],
    };
    expect(vm.getDotColor(normalRelease)).toBe("info");
    expect(vm.getDotIcon(normalRelease)).toBe("mdi-tag-outline");
  });

  it("formats date strings properly", () => {
    const wrapper = mount(UpgradeTimeline);
    const vm = wrapper.vm as any;

    expect(vm.formatDate(undefined)).toBe("");
    expect(vm.formatDate("2024-01-15T00:00:00.000Z")).toContain("2024");
    expect(vm.formatDate("invalid-date-string")).toBe("invalid-date-string");
  });
});
