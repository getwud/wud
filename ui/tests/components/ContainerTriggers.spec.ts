import { mount, flushPromises } from "@vue/test-utils";
import ContainerTriggers from "@/components/ContainerTriggers.vue";
import * as containerService from "@/services/container";

jest.mock("@/services/container", () => ({
  getContainerTriggers: jest.fn(),
}));

describe("ContainerTriggers.vue", () => {
  const containerA = {
    id: "container-a-123",
    name: "service-a",
    updateAvailable: true,
  };

  const containerB = {
    id: "container-b-456",
    name: "service-b",
    updateAvailable: false,
  };

  const triggersA = [
    {
      id: "discord.prod",
      type: "discord",
      name: "prod",
    },
    {
      id: "docker.local",
      type: "docker",
      name: "local",
    },
  ];

  const triggersB = [
    {
      id: "telegram.alerts",
      type: "telegram",
      name: "alerts",
    },
  ];

  const mountOptions = {
    global: {
      stubs: {
        "container-trigger": {
          template: '<div class="container-trigger" :data-id="trigger.id">{{ trigger.name }}</div>',
          props: ["trigger", "updateAvailable", "containerId"],
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches triggers on creation for the initial container", async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue(triggersA);

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    await flushPromises();

    expect(containerService.getContainerTriggers).toHaveBeenCalledWith("container-a-123");
    expect((wrapper.vm as any).triggers).toEqual(triggersA);
    expect(wrapper.text()).not.toContain("No triggers associated to the container");
    expect(wrapper.findAll(".container-trigger").length).toBe(2);
  });

  it("displays loading state while triggers are being fetched", async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (containerService.getContainerTriggers as jest.Mock).mockReturnValue(pendingPromise);

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    expect((wrapper.vm as any).loading).toBe(true);
    expect(wrapper.text()).toContain("Loading triggers...");

    resolvePromise!(triggersA);
    await flushPromises();

    expect((wrapper.vm as any).loading).toBe(false);
    expect(wrapper.text()).not.toContain("Loading triggers...");
  });

  it("displays empty message when container has no triggers", async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue([]);

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("No triggers associated to the container");
    expect(wrapper.findAll(".container-trigger").length).toBe(0);
  });

  it("re-fetches triggers when container prop changes to a different container", async () => {
    (containerService.getContainerTriggers as jest.Mock)
      .mockResolvedValueOnce(triggersA)
      .mockResolvedValueOnce(triggersB);

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    await flushPromises();

    expect(containerService.getContainerTriggers).toHaveBeenCalledTimes(1);
    expect(containerService.getContainerTriggers).toHaveBeenCalledWith("container-a-123");
    expect((wrapper.vm as any).triggers).toEqual(triggersA);

    // Change container prop to containerB
    await wrapper.setProps({
      container: containerB,
    });

    await flushPromises();

    expect(containerService.getContainerTriggers).toHaveBeenCalledTimes(2);
    expect(containerService.getContainerTriggers).toHaveBeenLastCalledWith("container-b-456");
    expect((wrapper.vm as any).triggers).toEqual(triggersB);
    expect(wrapper.findAll(".container-trigger").length).toBe(1);
  });

  it("does not re-fetch triggers if container prop is updated with same id", async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue(triggersA);

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    await flushPromises();
    expect(containerService.getContainerTriggers).toHaveBeenCalledTimes(1);

    await wrapper.setProps({
      container: { ...containerA, updateAvailable: false },
    });

    await flushPromises();
    expect(containerService.getContainerTriggers).toHaveBeenCalledTimes(1);
  });

  it("clears triggers when container prop is updated without an id", async () => {
    (containerService.getContainerTriggers as jest.Mock).mockResolvedValue(triggersA);

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    await flushPromises();
    expect((wrapper.vm as any).triggers).toEqual(triggersA);

    await wrapper.setProps({
      container: {},
    });

    await flushPromises();
    expect((wrapper.vm as any).triggers).toEqual([]);
    expect(wrapper.text()).toContain("No triggers associated to the container");
  });

  it("handles getContainerTriggers error gracefully", async () => {
    (containerService.getContainerTriggers as jest.Mock).mockRejectedValue(
      new Error("Network Error")
    );

    const wrapper = mount(ContainerTriggers, {
      ...mountOptions,
      props: {
        container: containerA,
      },
    });

    await flushPromises();

    expect((wrapper.vm as any).loading).toBe(false);
    expect((wrapper.vm as any).triggers).toEqual([]);
    expect(wrapper.text()).toContain("No triggers associated to the container");
  });
});
