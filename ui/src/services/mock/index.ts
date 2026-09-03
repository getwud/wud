import { mockContainers } from "./data/containers";
import { mockRegistries } from "./data/registries";
import { mockWatchers } from "./data/watchers";
import { mockTriggers } from "./data/triggers";
import { mockAuthentications } from "./data/authentications";
import {
  mockServer,
  mockLog,
  mockStore,
  mockAppInfos,
  mockStrategies,
  mockUser,
} from "./data/server";

export function isDemoMode(): boolean {
  if (process.env.VUE_APP_DEMO_MODE === "true") {
    return true;
  }
  if (typeof window !== "undefined") {
    if ((window as any).__WUD_DEMO_MODE__ === true) {
      return true;
    }
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("demo") === "true" || searchParams.has("demo")) {
        return true;
      }
      if (window.location.hash.includes("demo=true")) {
        return true;
      }
    } catch (e) {
      // ignore
    }
  }
  return false;
}

// In-memory demo state for interactive experience
let containersState = JSON.parse(JSON.stringify(mockContainers));
let currentUser: any = { ...mockUser };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockService = {
  // App
  async getAppInfos() {
    await delay(100);
    return { ...mockAppInfos };
  },

  // Auth
  async getStrategies() {
    await delay(100);
    return [...mockStrategies];
  },

  async getUser() {
    await delay(50);
    return currentUser ? { ...currentUser } : undefined;
  },

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async loginBasic(username: string, _password?: string) {
    await delay(300);
    currentUser = { username: username || "homelab-admin" };
    return { ...currentUser };
  },

  async getOidcRedirection(_name?: string, _nextPath?: string) {
    await delay(200);
    return { url: "/#/containers" };
  },

  async logout() {
    await delay(150);
    currentUser = undefined;
    return { success: true };
  },

  // Authentications
  async getAllAuthentications() {
    await delay(150);
    return JSON.parse(JSON.stringify(mockAuthentications));
  },

  // Containers
  async getAllContainers() {
    await delay(200);
    return JSON.parse(JSON.stringify(containersState));
  },

  async refreshAllContainers() {
    await delay(600);
    return JSON.parse(JSON.stringify(containersState));
  },

  async refreshContainer(containerId: string) {
    await delay(400);
    const found = containersState.find((c: any) => c.id === containerId);
    return found ? JSON.parse(JSON.stringify(found)) : undefined;
  },

  async deleteContainer(containerId: string) {
    await delay(250);
    containersState = containersState.filter((c: any) => c.id !== containerId);
    return { ok: true, status: 200 };
  },

  async getContainerTriggers(_containerId?: string) {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    await delay(150);
    return mockTriggers.map((t) => ({
      id: t.id,
      type: t.type,
      name: t.name,
      configuration: {
        threshold: t.configuration.threshold || "all",
      },
    }));
  },

  async runContainerTrigger({ containerId, triggerType, triggerName }: any) {
    await delay(500);
    return {
      status: 200,
      message: `Trigger ${triggerType}.${triggerName} executed for container ${containerId}`,
    };
  },

  // Registries
  async getAllRegistries() {
    await delay(150);
    return JSON.parse(JSON.stringify(mockRegistries));
  },

  // Triggers
  async getAllTriggers() {
    await delay(150);
    return JSON.parse(JSON.stringify(mockTriggers));
  },

  async runTrigger({ triggerType, triggerName }: any) {
    await delay(500);
    return {
      status: 200,
      message: `Trigger ${triggerType}.${triggerName} executed successfully`,
    };
  },

  // Watchers
  async getAllWatchers() {
    await delay(150);
    return JSON.parse(JSON.stringify(mockWatchers));
  },

  // Server, Log, Store
  async getServer() {
    await delay(150);
    return JSON.parse(JSON.stringify(mockServer));
  },

  async getLog() {
    await delay(100);
    return JSON.parse(JSON.stringify(mockLog));
  },

  async getStore() {
    await delay(100);
    return JSON.parse(JSON.stringify(mockStore));
  },

  // Reset demo state if needed
  resetState() {
    containersState = JSON.parse(JSON.stringify(mockContainers));
    currentUser = { ...mockUser };
  },
};
