import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getContainerIcon() {
  return "mdi-docker";
}

async function getAllContainers() {
  if (isDemoMode()) {
    return mockService.getAllContainers();
  }
  const response = await fetch(url("api/containers"), { credentials: "include" });
  return response.json();
}

async function refreshAllContainers() {
  if (isDemoMode()) {
    return mockService.refreshAllContainers();
  }
  const response = await fetch(url("api/containers/watch"), {
    method: "POST",
    credentials: "include",
  });
  return response.json();
}

async function refreshContainer(containerId) {
  if (isDemoMode()) {
    return mockService.refreshContainer(containerId);
  }
  const response = await fetch(url(`api/containers/${containerId}/watch`), {
    method: "POST",
    credentials: "include",
  });
  if (response.status === 404) {
    return undefined;
  }
  return response.json();
}

async function deleteContainer(containerId) {
  if (isDemoMode()) {
    return mockService.deleteContainer(containerId);
  }
  return fetch(url(`api/containers/${containerId}`), { method: "DELETE", credentials: "include" });
}

async function getContainerTriggers(containerId) {
  if (isDemoMode()) {
    return mockService.getContainerTriggers(containerId);
  }
  const response = await fetch(url(`api/containers/${containerId}/triggers`), { credentials: "include" });
  return response.json();
}

async function runTrigger({ containerId, triggerType, triggerName }) {
  if (isDemoMode()) {
    return mockService.runContainerTrigger({ containerId, triggerType, triggerName });
  }
  const response = await fetch(
    url(`api/containers/${containerId}/triggers/${triggerType}/${triggerName}`),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );
  return response.json();
}

async function snoozeContainer(
  containerId: string,
  { version, until }: { version?: string; until?: number } = {},
) {
  if (isDemoMode()) {
    return mockService.snoozeContainer(containerId, { version, until });
  }
  const response = await fetch(url(`api/containers/${containerId}/snooze`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, until }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || response.statusText);
  }
  return response.json();
}

async function unsnoozeContainer(containerId: string) {
  if (isDemoMode()) {
    return mockService.unsnoozeContainer(containerId);
  }
  const response = await fetch(url(`api/containers/${containerId}/snooze`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || response.statusText);
  }
  return response.json();
}

export {
  getContainerIcon,
  getAllContainers,
  refreshAllContainers,
  refreshContainer,
  deleteContainer,
  snoozeContainer,
  unsnoozeContainer,
  getContainerTriggers,
  runTrigger,
};
