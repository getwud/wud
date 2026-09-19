import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

let triggersCache: any[] = [];

/**
 * Get trigger component icon.
 * @returns {string}
 */
function getTriggerIcon(): string {
  return "mdi-bell-ring";
}

/**
 * Get trigger provider icon (slack, discord, docker...).
 * @param provider
 * @param triggerItem
 * @returns {string}
 */
function getTriggerProviderIcon(provider: string, triggerItem?: any): string {
  if (triggerItem?.configuration?.icon) {
    return triggerItem.configuration.icon;
  }

  if (provider && triggersCache && triggersCache.length > 0) {
    const cached = triggersCache.find(
      (t: any) =>
        t &&
        (t.id === provider || `${t.type}.${t.name}` === provider) &&
        t.configuration?.icon
    );
    if (cached) {
      return cached.configuration.icon;
    }
  }

  const defaultIcon = "mdi-bell-ring";
  if (!provider) {
    return defaultIcon;
  }

  const key = provider.split(".")[0].toLowerCase();
  switch (key) {
    case "amqp":
      return "simple-icons:rabbitmq";
    case "apprise":
      return "selfhst:apprise";
    case "bark":
      return "mdi:cellphone-sound";
    case "command":
      return "mdi:console-line";
    case "discord":
      return "logos:discord-icon";
    case "docker":
    case "dockercompose":
    case "docker-compose":
      return "logos:docker-icon";
    case "githubactions":
      return "logos:github-actions";
    case "gitlabci":
      return "logos:gitlab";
    case "gotify":
      return "selfhst:gotify";
    case "homeassistant":
    case "homeassistant-mqtt":
      return "selfhst:home-assistant";
    case "http":
      return "mdi:webhook";
    case "ifttt":
      return "simple-icons:ifttt";
    case "kafka":
      return "logos:kafka-icon";
    case "matrix":
      return "simple-icons:matrix";
    case "mattermost":
      return "logos:mattermost-icon";
    case "mqtt":
      return "selfhst:mqtt";
    case "nats":
      return "logos:nats-icon";
    case "nomad":
      return "logos:nomad-icon";
    case "ntfy":
      return "selfhst:ntfy";
    case "opsgenie":
      return "logos:opsgenie";
    case "pagerduty":
      return "logos:pagerduty-icon";
    case "prowl":
      return "mdi:bell-badge-outline";
    case "pushover":
      return "selfhst:pushover";
    case "rocketchat":
      return "simple-icons:rocketdotchat";
    case "signal":
      return "logos:signal";
    case "slack":
      return "logos:slack-icon";
    case "smtp":
      return "mdi:email-fast-outline";
    case "telegram":
      return "logos:telegram";
    case "uptimekuma":
      return "selfhst:uptime-kuma";
    case "whatsapp":
      return "logos:whatsapp-icon";
    case "zulip":
      return "logos:zulip-icon";
    default:
      return defaultIcon;
  }
}

/**
 * get all triggers.
 * @returns {Promise<any>}
 */
async function getAllTriggers(): Promise<any> {
  let data: any;
  if (isDemoMode()) {
    data = await mockService.getAllTriggers();
  } else {
    const response = await fetch(url("api/triggers"), { credentials: "include" });
    data = await response.json();
  }

  if (Array.isArray(data)) {
    const triggers = data.map((trigger: any) => ({
      ...trigger,
      icon: trigger?.configuration?.icon || getTriggerProviderIcon(trigger.type, trigger),
    }));
    triggersCache = triggers;
    return triggers;
  }

  triggersCache = [];
  return data;
}

/**
 * Run trigger on a container.
 */
async function runTrigger({
  triggerType,
  triggerName,
  container,
}: {
  triggerType: string;
  triggerName: string;
  container?: any;
}): Promise<any> {
  if (isDemoMode()) {
    return mockService.runTrigger({ triggerType, triggerName, container });
  }
  const response = await fetch(url(`api/triggers/${triggerType}/${triggerName}`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(container),
  });
  const json = await response.json();
  if (response.status !== 200) {
    throw new Error(json.error ? json.error : "Unknown error");
  }
  return json;
}

export { getTriggerIcon, getTriggerProviderIcon, getAllTriggers, runTrigger };
