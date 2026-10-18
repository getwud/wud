import { mount } from "@vue/test-utils";
import UpgradeReviewModal from "@/components/UpgradeReviewModal.vue";
import { copyToClipboard } from "@/services/clipboard";

const emitBusMock = jest.fn();
jest.mock("@/composables/useEventBus", () => ({
  useEventBus: () => ({
    emit: emitBusMock,
  }),
}));

jest.mock("@/services/clipboard", () => ({
  copyToClipboard: jest.fn(() => Promise.resolve(true)),
}));

const mockContainer = {
  id: "redis-cache",
  name: "redis",
  displayName: "Redis Cache",
  image: {
    name: "redis",
    tag: { value: "7.0.15" },
  },
  result: {
    tag: "7.2.4",
    riskAnalysis: {
      imageRef: "redis",
      currentTag: "7.0.15",
      targetTag: "7.2.4",
      riskScore: "high",
      skippedVersionsCount: 2,
      summary: "Major jump across versions with protocol changes.",
      breakingChanges: [
        "RESP3 protocol enabled by default",
        "Legacy ACL syntax removed",
      ],
      envVarChanges: [
        {
          name: "REDIS_PASSWORD",
          changeType: "modified",
          description: "Password configuration updated",
        },
      ],
      databaseImpact: "AOF and RDB format upgrade on startup",
      intermediateReleases: [
        {
          tag: "7.2.0",
          name: "Redis 7.2.0",
          publishedAt: "2023-08-15T00:00:00.000Z",
          isTarget: false,
          summary: "Major release",
          breakingChanges: ["RESP3 protocol enabled by default"],
        },
        {
          tag: "7.2.4",
          name: "Redis 7.2.4",
          publishedAt: "2024-01-10T00:00:00.000Z",
          isTarget: true,
          summary: "Security fix",
          breakingChanges: [],
        },
      ],
      evaluatedAt: "2024-01-10T00:00:00.000Z",
    },
  },
};

describe("UpgradeReviewModal.vue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal header and version jump info", () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    expect(wrapper.text()).toContain("Upgrade Review — redis");
    expect((wrapper.vm as any).currentTag).toBe("7.0.15");
    expect((wrapper.vm as any).targetTag).toBe("7.2.4");
    expect(wrapper.text()).toContain("7.0.15");
    expect(wrapper.text()).toContain("7.2.4");
    expect(wrapper.text()).not.toContain("[object Object]");
  });

  it("renders pre-flight summary with executive summary, breaking changes, and database impact", () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    expect(wrapper.text()).toContain("EXECUTIVE SUMMARY");
    expect(wrapper.text()).toContain("Major jump across versions with protocol changes.");
    expect(wrapper.text()).toContain("CUMULATIVE BREAKING CHANGES (2)");
    expect(wrapper.text()).toContain("RESP3 protocol enabled by default");
    expect(wrapper.text()).toContain("Database & Storage Impact");
    expect(wrapper.text()).toContain("AOF and RDB format upgrade on startup");
    expect(wrapper.text()).toContain("ENVIRONMENT VARIABLE CHANGES (1)");
    expect(wrapper.text()).toContain("REDIS_PASSWORD");
  });

  it("switches to journey tab and renders intermediate release items", async () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    (wrapper.vm as any).activeTab = "journey";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("INTERMEDIATE RELEASE TIMELINE");
    expect(wrapper.text()).toContain("7.2.0");
    expect(wrapper.text()).toContain("Redis 7.2.0");
    expect(wrapper.text()).toContain("7.2.4");
  });

  it("switches to checklist tab and tracks completed checklist items", async () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    (wrapper.vm as any).activeTab = "checklist";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("PRE-FLIGHT READINESS CHECKLIST");
    expect((wrapper.vm as any).checklistCompletedCount).toBe(0);

    // Check first item
    (wrapper.vm as any).checklistItems[0].checked = true;
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).checklistCompletedCount).toBe(1);
    expect(wrapper.text()).toContain("1 / 4 completed");
  });

  it("emits update-now when Update Container button is clicked", async () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    (wrapper.vm as any).onUpdateNow();
    expect(wrapper.emitted("update-now")).toBeTruthy();
    expect(wrapper.emitted("update-now")![0][0]).toEqual(mockContainer);
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([false]);
  });

  it("closes modal on close()", () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    (wrapper.vm as any).close();
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([false]);
  });

  it("generates markdown report and copies to clipboard", async () => {
    const wrapper = mount(UpgradeReviewModal, {
      props: {
        modelValue: true,
        container: mockContainer,
      },
    });

    await (wrapper.vm as any).exportMarkdown();
    expect(copyToClipboard).toHaveBeenCalled();
    const copiedText = (copyToClipboard as jest.Mock).mock.calls[0][0];
    expect(copiedText).toContain("# Upgrade Review Report: redis");
    expect(copiedText).toContain("## Executive Summary");
    expect(copiedText).toContain("## Breaking Changes (2)");
    expect(copiedText).toContain("## Pre-Flight Readiness Checklist");
    expect(emitBusMock).toHaveBeenCalledWith("notify", "Upgrade review markdown copied to clipboard");
  });
});
