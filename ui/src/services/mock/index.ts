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
import type { UserItem } from "../user";
import type { ApiTokenItem } from "../profile";

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

const initialMockUsers: UserItem[] = [
  {
    id: "user-admin-1",
    username: "homelab-admin",
    role: "admin",
    provider: "local",
    preferences: { theme: "light" },
  },
  {
    id: "user-rw-2",
    username: "developer",
    role: "rw",
    provider: "local",
    preferences: { theme: "dark" },
  },
  {
    id: "user-ro-3",
    username: "viewer-oidc",
    role: "ro",
    provider: "oidc",
    preferences: { theme: "light" },
  },
];

const initialMockTokens: ApiTokenItem[] = [
  {
    id: "token-1",
    userId: "user-admin-1",
    name: "Home Assistant",
    scopes: ["read"],
    expiresAt: null,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  },
];

let usersState: UserItem[] = JSON.parse(JSON.stringify(initialMockUsers));
let tokensState: ApiTokenItem[] = JSON.parse(JSON.stringify(initialMockTokens));

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
    const uname = username?.trim() || "homelab-admin";
    const existing = usersState.find(
      (u) => u.username.toLowerCase() === uname.toLowerCase()
    );
    if (existing) {
      currentUser = { ...existing };
    } else {
      let role: "admin" | "rw" | "ro" = "admin";
      const lower = uname.toLowerCase();
      if (lower.includes("ro") || lower.includes("viewer") || lower.includes("read")) {
        role = "ro";
      } else if (lower.includes("rw") || lower.includes("editor") || lower.includes("write")) {
        role = "rw";
      }
      currentUser = {
        id: `user-${Date.now()}`,
        username: uname,
        role,
        provider: "local",
        preferences: { theme: "light" },
      };
      usersState.push({ ...currentUser });
    }
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

  async snoozeContainer(containerId: string, { version, until }: any = {}) {
    await delay(250);
    const found = containersState.find((c: any) => c.id === containerId);
    if (!found) throw new Error("Container not found");
    found.snoozedVersion = version || found.result?.tag || found.result?.digest;
    found.snoozedUntil = until ?? null;
    found.isSnoozed = true;
    found.updateAvailable = false;
    return JSON.parse(JSON.stringify(found));
  },

  async unsnoozeContainer(containerId: string) {
    await delay(250);
    const found = containersState.find((c: any) => c.id === containerId);
    if (!found) throw new Error("Container not found");
    found.snoozedVersion = null;
    found.snoozedUntil = null;
    found.isSnoozed = false;
    found.updateAvailable = true;
    return JSON.parse(JSON.stringify(found));
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

  // Users (Admin)
  async listUsers(): Promise<UserItem[]> {
    await delay(100);
    return JSON.parse(JSON.stringify(usersState));
  },

  async createUser(data: any): Promise<UserItem> {
    await delay(100);
    const newUser: UserItem = {
      id: `user-${Date.now()}`,
      username: data.username,
      role: (data.role as "admin" | "rw" | "ro") || "ro",
      provider: "local",
      preferences: { theme: "light" },
    };
    usersState.push(newUser);
    return { ...newUser };
  },

  async updateUser(id: string, data: any): Promise<UserItem> {
    await delay(100);
    const found = usersState.find((u) => u.id === id);
    if (found) {
      if (data.role) found.role = data.role;
      return { ...found };
    }
    return {
      id,
      username: "updated-user",
      role: (data.role as "admin" | "rw" | "ro") || "ro",
      provider: "local",
    };
  },

  async deleteUser(id: string) {
    await delay(100);
    usersState = usersState.filter((u) => u.id !== id);
  },

  // Profile & Tokens
  async getProfile(): Promise<UserItem> {
    await delay(50);
    return { ...currentUser };
  },

  async updatePreferences(preferences: any): Promise<UserItem> {
    await delay(50);
    currentUser.preferences = { ...currentUser.preferences, ...preferences };
    const found = usersState.find((u) => u.id === currentUser.id);
    if (found) {
      found.preferences = { ...currentUser.preferences };
    }
    return { ...currentUser };
  },

  async updatePassword(currentPassword?: string, newPassword?: string) {
    void currentPassword;
    void newPassword;
    await delay(100);
    return { message: "Password updated successfully" };
  },

  async listTokens(): Promise<ApiTokenItem[]> {
    await delay(100);
    const currentId = currentUser?.id || "user-admin-1";
    return JSON.parse(JSON.stringify(tokensState.filter((t) => t.userId === currentId)));
  },

  async createToken(data: any): Promise<{ token: ApiTokenItem; rawSecret: string }> {
    await delay(100);
    const currentId = currentUser?.id || "user-admin-1";
    const newToken: ApiTokenItem = {
      id: `token-${Date.now()}`,
      userId: currentId,
      name: data.name,
      scopes: (data.scopes as ("read" | "write")[]) || ["read"],
      expiresAt: data.expiresAt || null,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    tokensState.push(newToken);
    return {
      token: { ...newToken },
      rawSecret: `wud_demo_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
    };
  },

  async deleteToken(id: string) {
    await delay(100);
    tokensState = tokensState.filter((t) => t.id !== id);
  },

  // Reset demo state if needed
  resetState() {
    containersState = JSON.parse(JSON.stringify(mockContainers));
    currentUser = { ...mockUser };
    usersState = JSON.parse(JSON.stringify(initialMockUsers));
    tokensState = JSON.parse(JSON.stringify(initialMockTokens));
  },
};
