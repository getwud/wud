import { mount } from "@vue/test-utils";
import RiskPill from "@/components/RiskPill.vue";

const pushMock = jest.fn();
jest.mock("vue-router", () => ({
  useRouter: jest.fn(() => ({
    push: pushMock,
  })),
}));

describe("RiskPill.vue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders low risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "low",
      },
    });

    expect(wrapper.text()).toContain("Low risk");
    expect((wrapper.vm as any).chipColor).toBe("success");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-shield-check");
    expect((wrapper.vm as any).chipVariant).toBe("tonal");
  });

  it("renders medium risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "medium",
      },
    });

    expect(wrapper.text()).toContain("Medium risk");
    expect((wrapper.vm as any).chipColor).toBe("warning");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-alert-circle-outline");
    expect((wrapper.vm as any).chipVariant).toBe("tonal");
  });

  it("renders high risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "high",
      },
    });

    expect(wrapper.text()).toContain("High risk");
    expect((wrapper.vm as any).chipColor).toBe("deep-orange");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-alert-octagon-outline");
    expect((wrapper.vm as any).chipVariant).toBe("flat");
  });

  it("renders critical risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "critical",
      },
    });

    expect(wrapper.text()).toContain("Critical risk");
    expect((wrapper.vm as any).chipColor).toBe("error");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-alert-decagram");
    expect((wrapper.vm as any).chipVariant).toBe("flat");
  });

  it("renders locked risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "locked",
      },
    });

    expect(wrapper.text()).toContain("Locked");
    expect((wrapper.vm as any).chipColor).toBe("primary");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-lock-outline");
    expect((wrapper.vm as any).chipVariant).toBe("tonal");
  });

  it("renders pending risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "pending",
      },
    });

    expect(wrapper.text()).toContain("Analyzing...");
    expect((wrapper.vm as any).chipColor).toBe("grey");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-loading");
    expect((wrapper.vm as any).isPending).toBe(true);
  });

  it("renders unsupported risk pill correctly", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "unsupported",
      },
    });

    expect(wrapper.text()).toContain("Unsupported");
    expect((wrapper.vm as any).chipColor).toBe("grey");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-help-circle-outline");
  });

  it("renders unknown risk pill by default", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "something-random",
      },
    });

    expect(wrapper.text()).toContain("Unknown risk");
    expect((wrapper.vm as any).chipColor).toBe("grey");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-shield-outline");
  });

  it("renders unpaired state correctly", async () => {
    const wrapper = mount(RiskPill, {
      props: {
        isUnpaired: true,
      },
    });

    expect(wrapper.text()).toContain("AI Risk Check");
    expect((wrapper.vm as any).chipColor).toBe("primary");
    expect((wrapper.vm as any).chipIcon).toBe("mdi-lock-outline");
    expect((wrapper.vm as any).tooltipText).toContain("Connect to WUD Hub");

    await wrapper.find(".risk-pill").trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/hub");
  });

  it("renders skipped versions count badge when skippedVersionsCount > 0", () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "medium",
        skippedVersionsCount: 3,
      },
    });

    expect(wrapper.text()).toContain("+3 versions");
    expect(wrapper.find(".skipped-pill").exists()).toBe(true);
  });

  it("renders review button and emits open-review on click", async () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "high",
        showReviewButton: true,
      },
    });

    const reviewBtn = wrapper.find(".review-btn");
    expect(reviewBtn.exists()).toBe(true);
    await reviewBtn.trigger("click");
    expect(wrapper.emitted("open-review")).toBeTruthy();
  });

  it("emits click event on chip click", async () => {
    const wrapper = mount(RiskPill, {
      props: {
        riskScore: "low",
        clickable: true,
      },
    });

    await wrapper.find(".risk-pill").trigger("click");
    expect(wrapper.emitted("click")).toBeTruthy();
  });
});
