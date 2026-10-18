import { url } from "./base";
import { isDemoMode } from "./mock";

export interface HubStatus {
  enabled: boolean;
  status: 'connected' | 'degraded' | 'error' | 'standalone';
  endpoint: string;
  hasKey: boolean;
  lastCheck?: string;
  errorMessage?: string;
}

export async function getHubStatus(): Promise<HubStatus> {
  if (isDemoMode()) {
    return {
      enabled: true,
      status: "connected",
      endpoint: "https://hub.getwud.com",
      hasKey: true,
      lastCheck: new Date().toISOString(),
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
