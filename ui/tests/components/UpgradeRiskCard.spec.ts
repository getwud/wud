import { mount } from "@vue/test-utils";
import UpgradeRiskCard, { RiskAnalysisResult } from "@/components/UpgradeRiskCard.vue";

const mockContainer = {
  id: "test-container-id",
  name: "redis",
  displayName: "Redis",
  image: {
    tag: { value: "7.0.0" },
  },
  result: {
    tag: "7.2.0",
    link: "https://github.com/redis/redis/releases/tag/7.2.0",
  },
};

const mockAnalysis: RiskAnalysisResult = {
  imageRef: "redis",
  currentTag: "7.0.0",
  targetTag: "7.2.0",
  riskScore: "high",
  summary: "Major breaking changes and configuration deprecations.",
  skippedVersionsCount: 2,
  breakingChanges: [
    "Deprecated ACL rules removed in favor of selector syntax",
    "Maxmemory policy default changed",
  ],
  envVarChanges: [
    {
      name: "REDIS_PASSWORD",
      changeType: "required" as any,
      description: "Password is now strictly required",
    },
    {
      name: "REDIS_LEGACY_MODE",
      changeType: "removed" as any,
      description: "Legacy protocol v2 support removed",
    },
  ],
  databaseImpact: "AOF format version upgraded. Cannot be downgraded to Redis 7.0 without full RDB restore.",
  evaluatedAt: "2026-10-18T12:00:00.000Z",
  cached: true,
};

describe("UpgradeRiskCard.vue", () => {
  it("renders teaser mode when isUnpaired is true", () => {
    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        isUnpaired: true,
      },
    });

    expect(wrapper.text()).toContain("Update Risk Analysis");
    expect(wrapper.text()).toContain("Hub Feature");
    expect(wrapper.text()).toContain("Connect to WUD Hub");
    expect(wrapper.find(".teaser-preview").exists()).toBe(true);
  });

  it("renders paired mode with full analysis data", () => {
    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: mockAnalysis,
        isUnpaired: false,
      },
    });

    expect(wrapper.text()).toContain("Upgrade Risk Analysis");
    expect(wrapper.text()).toContain("cached");
    expect(wrapper.text()).toContain(mockAnalysis.summary);
    expect(wrapper.text()).toContain("Multi-Version Upgrade Jump");
    expect(wrapper.text()).toContain("BREAKING CHANGES (2)");
    expect(wrapper.text()).toContain("Deprecated ACL rules removed in favor of selector syntax");
    expect(wrapper.text()).toContain("Database & Storage Impact");
    expect(wrapper.text()).toContain("AOF format version upgraded");
    expect(wrapper.text()).toContain("ENVIRONMENT VARIABLE CHANGES (2)");
    expect(wrapper.text()).toContain("REDIS_PASSWORD");
    expect(wrapper.text()).toContain("REDIS_LEGACY_MODE");
    expect(wrapper.text()).toContain("Review Upgrade Journey");
    expect(wrapper.text()).toContain("View Release Notes");
    expect(wrapper.text()).toContain("Re-evaluate Risk");
  });

  it("renders expandable timeline panel when intermediate releases are present", () => {
    const analysisWithReleases: RiskAnalysisResult = {
      ...mockAnalysis,
      intermediateReleases: [
        {
          tag: "7.1.0",
          name: "Redis 7.1.0",
          publishedAt: "2023-01-01T00:00:00.000Z",
          summary: "Feature release",
        },
      ],
    };

    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: analysisWithReleases,
        isUnpaired: false,
      },
    });

    expect(wrapper.text()).toContain("Intermediate Releases Timeline (1)");
    expect(wrapper.text()).toContain("7.1.0");
  });

  it("renders freemium gated banner when freemiumGated is true", () => {
    const gatedAnalysis: RiskAnalysisResult = {
      ...mockAnalysis,
      freemiumGated: true,
      trialActivationUrl: "https://hub.getwud.app/trials",
    };

    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: gatedAnalysis,
        isUnpaired: false,
      },
    });

    expect(wrapper.text()).toContain("Multi-Version Journey Locked");
    expect(wrapper.text()).toContain("Start 14-Day Free Trial");
  });

  it("renders loading state when loading is true", () => {
    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: mockAnalysis,
        loading: true,
        isUnpaired: false,
      },
    });

    expect(wrapper.text()).toContain("Evaluating changelog risks via WUD Hub...");
  });

  it("emits open-review event when Review Upgrade Journey button is clicked", () => {
    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: mockAnalysis,
        isUnpaired: false,
      },
    });

    (wrapper.vm as any).onOpenReview();
    expect(wrapper.emitted("open-review")).toBeTruthy();
    expect(wrapper.emitted("open-review")![0][0]).toEqual({
      container: mockContainer,
      analysis: mockAnalysis,
    });
  });

  it("emits re-evaluate event when Re-evaluate Risk button is clicked", async () => {
    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: mockAnalysis,
        isUnpaired: false,
      },
    });

    await (wrapper.vm as any).onReEvaluate();
    expect(wrapper.emitted("re-evaluate")).toBeTruthy();
    expect(wrapper.emitted("re-evaluate")![0]).toEqual([
      {
        containerId: "test-container-id",
        forceRefresh: true,
      },
    ]);
  });

  it("handles fallback colors for env var changes", () => {
    const wrapper = mount(UpgradeRiskCard, {
      props: {
        container: mockContainer,
        riskAnalysis: mockAnalysis,
      },
    });

    expect((wrapper.vm as any).getEnvVarChipColor("removed")).toBe("error");
    expect((wrapper.vm as any).getEnvVarChipColor("required")).toBe("error");
    expect((wrapper.vm as any).getEnvVarChipColor("modified")).toBe("warning");
    expect((wrapper.vm as any).getEnvVarChipColor("added")).toBe("success");
    expect((wrapper.vm as any).getEnvVarChipColor("optional")).toBe("secondary");
  });
});
