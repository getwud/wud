import { mount } from "@vue/test-utils";
import ConfigurationTriggersView from "@/views/ConfigurationTriggersView.vue";
import * as triggerService from "@/services/trigger";

jest.mock("@/services/trigger", () => ({
  getAllTriggers: jest.fn(),
  getTriggerIcon: jest.fn(() => "mdi-bell-ring"),
  getTriggerProviderIcon: jest.fn((provider: string) =>
    provider === "slack" ? "logos:slack-icon" : "mdi-bell-ring"
  ),
  runTrigger: jest.fn(),
}));

const mockTriggers = [
  {
    id: "slack.team",
    type: "slack",
    name: "team",
    supportsSimulation: true,
    configuration: { channel: "#general" },
  },
  {
    id: "smtp.mail",
    type: "smtp",
    name: "mail",
    supportsSimulation: true,
    configuration: { host: "smtp.example.com" },
  },
  {
    id: "docker.local",
    type: "docker",
    name: "local",
    supportsSimulation: false,
    configuration: { prune: false },
  },
];

describe("ConfigurationTriggersView.vue", () => {
  beforeEach(() => {
    (triggerService.getAllTriggers as jest.Mock).mockResolvedValue(mockTriggers);
  });

  it("renders table and handles search filtering", async () => {
    const wrapper = mount(ConfigurationTriggersView);
    await wrapper.setData({ triggers: mockTriggers });

    const vm = wrapper.vm as any;
    expect(vm.triggersFiltered).toHaveLength(3);

    vm.search = "slack";
    expect(vm.triggersFiltered).toHaveLength(1);
    expect(vm.triggersFiltered[0].type).toBe("slack");

    vm.search = "";
    expect(vm.triggersFiltered).toHaveLength(3);
  });

  it("opens drawer on row click", async () => {
    const wrapper = mount(ConfigurationTriggersView);
    await wrapper.setData({ triggers: mockTriggers });

    const vm = wrapper.vm as any;
    expect(vm.drawerOpen).toBe(false);

    vm.onRowClick({}, { item: mockTriggers[0] });
    expect(vm.drawerOpen).toBe(true);
    expect(vm.selectedTrigger).toEqual(mockTriggers[0]);
    expect(vm.canTestSelectedTrigger).toBe(true);
  });

  it("disables trigger testing for non-simulatable action triggers and read-only users", async () => {
    const wrapper = mount(ConfigurationTriggersView);
    await wrapper.setData({
      triggers: mockTriggers,
      currentUser: { username: "admin", role: "admin" },
    });

    const vm = wrapper.vm as any;

    // Action trigger (docker) cannot be tested even by admin
    vm.onRowClick({}, { item: mockTriggers[2] });
    await wrapper.vm.$nextTick();
    expect(vm.selectedTrigger.id).toBe("docker.local");
    expect(vm.canTestSelectedTrigger).toBe(false);
    expect(wrapper.findComponent({ name: "TriggerTestDialog" }).exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Test this trigger");

    // Notification trigger (slack) can be tested by admin
    vm.onRowClick({}, { item: mockTriggers[0] });
    await wrapper.vm.$nextTick();
    expect(vm.canTestSelectedTrigger).toBe(true);
    expect(wrapper.findComponent({ name: "TriggerTestDialog" }).exists()).toBe(true);

    // Read-only user cannot test notification trigger
    await wrapper.setData({ currentUser: { username: "viewer", role: "ro" } });
    await wrapper.vm.$nextTick();
    expect(vm.canTestSelectedTrigger).toBe(false);
    expect(wrapper.findComponent({ name: "TriggerTestDialog" }).exists()).toBe(false);
  });

  it("refreshes triggers on refreshTriggers and enriches icons", async () => {
    const wrapper = mount(ConfigurationTriggersView);
    const vm = wrapper.vm as any;

    await vm.refreshTriggers();
    expect(triggerService.getAllTriggers).toHaveBeenCalled();
    expect(vm.triggers).toHaveLength(3);
  });

  it("maps custom icon from configuration.icon on refreshTriggers", async () => {
    const customTriggers = [
      {
        id: "custom.mytrigger",
        type: "custom",
        name: "mytrigger",
        configuration: { icon: "mdi:webhook" },
      },
      {
        id: "slack.team",
        type: "slack",
        name: "team",
        configuration: {},
      },
    ];
    (triggerService.getAllTriggers as jest.Mock).mockResolvedValue(customTriggers);

    const wrapper = mount(ConfigurationTriggersView);
    const vm = wrapper.vm as any;

    await vm.refreshTriggers();

    expect(vm.triggers).toHaveLength(2);
    const customTrig = vm.triggers.find((t: any) => t.id === "custom.mytrigger");
    const slackTrig = vm.triggers.find((t: any) => t.id === "slack.team");
    expect(customTrig.icon).toBe("mdi:webhook");
    expect(slackTrig.icon).toBe("logos:slack-icon");
  });
});
