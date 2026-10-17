import { url } from "./base";
import { isDemoMode } from "./mock";

export interface HubStatus {
  enabled: boolean;
  status: 'connected' | 'degraded' | 'error' | 'standalone';
  endpoint: string;
  hasKey: boolean;
  lastCheck?: string;
  errorMessage?: string;
  cacheStats: {
    size: number;
    hits: number;
    misses: number;
  };
}

export async function getHubStatus(): Promise<HubStatus> {
  if (isDemoMode()) {
    return {
      enabled: true,
      status: "connected",
      endpoint: "https://hub.getwud.com",
      hasKey: true,
      lastCheck: new Date().toISOString(),
      cacheStats: {
        size: 1,
        hits: 5,
        misses: 1,
      },
    };
  }
  const response = await fetch(url("api/hub/status"), {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Hub status: ${response.statusText}`);
  }
  return response.json();
}

export async function clearHubCache(): Promise<void> {
  if (isDemoMode()) {
    return;
  }
  const response = await fetch(url("api/hub/cache/clear"), {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear Hub cache: ${response.statusText}`);
  }
}
