import { mount } from "@vue/test-utils";
import ContainerTrigger from "@/components/ContainerTrigger.vue";
import * as containerService from "@/services/container";
import * as authService from "@/services/auth";

jest.mock("@/services/container", () => ({
  runTrigger: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  getUser: jest.fn(),
}));

describe("ContainerTrigger.vue", () => {
  const defaultTrigger = {
    id: "discord.prod",
    type: "discord",
    name: "prod",
    configuration: { threshold: "minor" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUser as jest.Mock).mockResolvedValue({
      username: "admin",
      role: "admin",
    });
  });

  it("computes triggerIcon based on trigger type", () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: defaultTrigger,
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.triggerIcon).toBe("logos:discord-icon");
  });

  it("computes triggerIcon from trigger.icon when provided", () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: {
          ...defaultTrigger,
          icon: "mdi:custom-bell",
        },
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.triggerIcon).toBe("mdi:custom-bell");
  });

  it("computes triggerIcon from trigger.configuration.icon when provided", () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: {
          ...defaultTrigger,
          configuration: {
            threshold: "all",
            icon: "logos:custom-logo",
          },
        },
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.triggerIcon).toBe("logos:custom-logo");
  });

  it("computes default fallback icon for unknown trigger type", () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: {
          id: "unknown.test",
          type: "unknown",
          name: "test",
        },
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.triggerIcon).toBe("mdi-bell-ring");
  });

  it("computes triggerIcon correctly when trigger has no configuration", () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: {
          id: "slack.default",
          type: "slack",
          name: "default",
        },
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.triggerIcon).toBe("logos:slack-icon");
  });

  it("computes default fallback icon when trigger has empty properties", () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: {},
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.triggerIcon).toBe("mdi-bell-ring");
  });

  it("handles canWrite according to user role", async () => {
    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: defaultTrigger,
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    await wrapper.vm.$nextTick();
    const vm = wrapper.vm as any;
    expect(vm.canWrite).toBe(true);

    await wrapper.setData({ currentUser: { role: "ro" } });
    expect(vm.canWrite).toBe(false);

    await wrapper.setData({ currentUser: { role: "rw" } });
    expect(vm.canWrite).toBe(true);
  });

  it("calls runTrigger when Run is triggered", async () => {
    (containerService.runTrigger as jest.Mock).mockResolvedValue({ status: 200 });
    const emitMock = jest.fn();

    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: defaultTrigger,
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
        mocks: {
          $eventBus: { emit: emitMock },
        },
      },
    });

    const vm = wrapper.vm as any;
    await vm.runTrigger();

    expect(containerService.runTrigger).toHaveBeenCalledWith({
      containerId: "c1",
      triggerType: "discord",
      triggerName: "prod",
    });
    expect(emitMock).toHaveBeenCalledWith("notify", "Trigger executed with success");
    expect(vm.isTriggering).toBe(false);
  });

  it("handles error when runTrigger fails", async () => {
    (containerService.runTrigger as jest.Mock).mockRejectedValue(new Error("Network error"));
    const emitMock = jest.fn();

    const wrapper = mount(ContainerTrigger, {
      props: {
        trigger: defaultTrigger,
        updateAvailable: true,
        containerId: "c1",
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
        mocks: {
          $eventBus: { emit: emitMock },
        },
      },
    });

    const vm = wrapper.vm as any;
    await vm.runTrigger();

    expect(emitMock).toHaveBeenCalledWith(
      "notify",
      "Trigger executed with error (Network error)",
      "error"
    );
    expect(vm.isTriggering).toBe(false);
  });
});
