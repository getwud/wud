import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getTriggerIcon() {
  return "mdi-bell-ring";
}

async function getAllTriggers() {
  if (isDemoMode()) {
    return mockService.getAllTriggers();
  }
  const response = await fetch(url("api/triggers"), { credentials: "include" });
  return response.json();
}

async function runTrigger({ triggerType, triggerName, container }) {
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

export { getTriggerIcon, getAllTriggers, runTrigger };

