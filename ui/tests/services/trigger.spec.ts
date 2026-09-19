import {
  getTriggerIcon,
  getTriggerProviderIcon,
  getAllTriggers,
  runTrigger,
} from "@/services/trigger";
import * as mockModule from "@/services/mock";

describe("Trigger Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    jest.spyOn(mockModule, "isDemoMode").mockReturnValue(false);
  });

  describe("getTriggerIcon", () => {
    it("should return generic trigger icon", () => {
      expect(getTriggerIcon()).toBe("mdi-bell-ring");
    });
  });

  describe("getTriggerProviderIcon", () => {
    it("should return custom icon from triggerItem configuration if present", () => {
      const triggerItem = {
        type: "discord",
        name: "my-discord",
        configuration: { icon: "custom:my-icon" },
      };
      expect(getTriggerProviderIcon("discord", triggerItem)).toBe("custom:my-icon");
    });

    it("should return default fallback icon when provider is empty or undefined", () => {
      expect(getTriggerProviderIcon("")).toBe("mdi-bell-ring");
      expect(getTriggerProviderIcon(undefined as any)).toBe("mdi-bell-ring");
    });

    it("should return default fallback icon for unknown provider", () => {
      expect(getTriggerProviderIcon("unknown_provider")).toBe("mdi-bell-ring");
    });

    it.each([
      ["amqp", "simple-icons:rabbitmq"],
      ["apprise", "selfhst:apprise"],
      ["bark", "mdi:cellphone-sound"],
      ["command", "mdi:console-line"],
      ["discord", "logos:discord-icon"],
      ["docker", "logos:docker-icon"],
      ["dockercompose", "logos:docker-icon"],
      ["docker-compose", "logos:docker-icon"],
      ["githubactions", "logos:github-actions"],
      ["gitlabci", "logos:gitlab"],
      ["gotify", "selfhst:gotify"],
      ["homeassistant", "selfhst:home-assistant"],
      ["homeassistant-mqtt", "selfhst:home-assistant"],
      ["http", "mdi:webhook"],
      ["ifttt", "simple-icons:ifttt"],
      ["kafka", "logos:kafka-icon"],
      ["matrix", "simple-icons:matrix"],
      ["mattermost", "logos:mattermost-icon"],
      ["mqtt", "selfhst:mqtt"],
      ["nats", "logos:nats-icon"],
      ["nomad", "logos:nomad-icon"],
      ["ntfy", "selfhst:ntfy"],
      ["opsgenie", "logos:opsgenie"],
      ["pagerduty", "logos:pagerduty-icon"],
      ["prowl", "mdi:bell-badge-outline"],
      ["pushover", "selfhst:pushover"],
      ["rocketchat", "simple-icons:rocketdotchat"],
      ["signal", "logos:signal"],
      ["slack", "logos:slack-icon"],
      ["smtp", "mdi:email-fast-outline"],
      ["telegram", "logos:telegram"],
      ["uptimekuma", "selfhst:uptime-kuma"],
      ["whatsapp", "logos:whatsapp-icon"],
      ["zulip", "logos:zulip-icon"],
    ])("should return '%s' icon for provider '%s'", (provider, expectedIcon) => {
      expect(getTriggerProviderIcon(provider)).toBe(expectedIcon);
      expect(getTriggerProviderIcon(`${provider}.instance1`)).toBe(expectedIcon);
    });

    it("should retrieve custom icon from cache when provider id matches", async () => {
      const mockApiTriggers = [
        {
          id: "custom.instance1",
          type: "custom",
          name: "instance1",
          configuration: { icon: "mdi:robot" },
        },
      ];
      (global as any).fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiTriggers),
      });

      await getAllTriggers();

      expect(getTriggerProviderIcon("custom.instance1")).toBe("mdi:robot");
    });
  });

  describe("getAllTriggers", () => {
    it("should fetch triggers, enrich them with icons, and update cache", async () => {
      const mockApiTriggers = [
        {
          id: "discord.prod",
          type: "discord",
          name: "prod",
          configuration: {},
        },
        {
          id: "custom.alert",
          type: "custom",
          name: "alert",
          configuration: { icon: "mdi:alert-box" },
        },
      ];

      (global as any).fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiTriggers),
      });

      const triggers = await getAllTriggers();

      expect((global as any).fetch).toHaveBeenCalledWith("/api/triggers", {
        credentials: "include",
      });
      expect(triggers).toHaveLength(2);
      expect(triggers[0].icon).toBe("logos:discord-icon");
      expect(triggers[1].icon).toBe("mdi:alert-box");
    });

    it("should handle non-array data gracefully", async () => {
      const nonArrayData = { error: "something went wrong" };
      (global as any).fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(nonArrayData),
      });

      const result = await getAllTriggers();
      expect(result).toEqual(nonArrayData);
    });

    it("should fetch triggers from mockService in demo mode and enrich them", async () => {
      jest.spyOn(mockModule, "isDemoMode").mockReturnValue(true);
      const mockDemoTriggers = [
        {
          id: "slack.general",
          type: "slack",
          name: "general",
          configuration: {},
        },
      ];
      jest.spyOn(mockModule.mockService, "getAllTriggers").mockResolvedValue(mockDemoTriggers as any);

      const triggers = await getAllTriggers();

      expect(mockModule.mockService.getAllTriggers).toHaveBeenCalled();
      expect(triggers[0].icon).toBe("logos:slack-icon");
    });
  });

  describe("runTrigger", () => {
    it("should run trigger via POST API and return json", async () => {
      const responseData = { status: 200, message: "OK" };
      (global as any).fetch.mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(responseData),
      });

      const container = { id: "c1", name: "nginx" };
      const result = await runTrigger({
        triggerType: "discord",
        triggerName: "prod",
        container,
      });

      expect((global as any).fetch).toHaveBeenCalledWith(
        "/api/triggers/discord/prod",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(container),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("should throw error when API response status is not 200", async () => {
      (global as any).fetch.mockResolvedValue({
        status: 500,
        json: jest.fn().mockResolvedValue({ error: "Failed to trigger" }),
      });

      await expect(
        runTrigger({
          triggerType: "discord",
          triggerName: "prod",
          container: {},
        })
      ).rejects.toThrow("Failed to trigger");
    });

    it("should throw default error message when json.error is missing on failure", async () => {
      (global as any).fetch.mockResolvedValue({
        status: 404,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        runTrigger({
          triggerType: "discord",
          triggerName: "prod",
          container: {},
        })
      ).rejects.toThrow("Unknown error");
    });

    it("should run trigger using mockService when in demo mode", async () => {
      jest.spyOn(mockModule, "isDemoMode").mockReturnValue(true);
      const mockResult = { status: 200, message: "Demo run OK" };
      jest.spyOn(mockModule.mockService, "runTrigger").mockResolvedValue(mockResult as any);

      const result = await runTrigger({
        triggerType: "discord",
        triggerName: "prod",
      });

      expect(mockModule.mockService.runTrigger).toHaveBeenCalledWith({
        triggerType: "discord",
        triggerName: "prod",
        container: undefined,
      });
      expect(result).toEqual(mockResult);
    });
  });
});