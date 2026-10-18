import { url } from "./base";
import { isDemoMode } from "./mock";

export interface RemoteHubOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface RemoteHubApiKey {
  preview: string;
  valid: boolean;
  scopes: string[];
}

export interface RemoteHubSubscription {
  planTier: string;
  status: string;
  trialDaysRemaining: number | null;
  portalUrl: string | null;
}

export interface RemoteHubQuota {
  monitoredContainers: number;
  limit: number;
}

export interface RemoteHubDetails {
  status?: string;
  organization: RemoteHubOrganization;
  apiKey: RemoteHubApiKey;
  subscription: RemoteHubSubscription;
  quota: RemoteHubQuota;
}

export interface HubStatus {
  enabled: boolean;
  status: 'connected' | 'degraded' | 'error' | 'standalone';
  endpoint: string;
  hasKey: boolean;
  lastCheck?: string;
  remote?: RemoteHubDetails;
  errorMessage?: string;
}

export async function getHubStatus(options?: { refresh?: boolean }): Promise<HubStatus> {
  if (isDemoMode()) {
    return {
      enabled: true,
      status: "connected",
      endpoint: "https://hub.getwud.app",
      hasKey: true,
      lastCheck: new Date().toISOString(),
      remote: {
        organization: {
          id: "org_demo",
          name: "Acme Corp",
          slug: "acme-corp",
        },
        apiKey: {
          preview: "wud_...0002",
          valid: true,
          scopes: ["metadata:read", "metadata:write"],
        },
        subscription: {
          planTier: "smart_updates",
          status: "active",
          trialDaysRemaining: null,
          portalUrl: "https://hub.getwud.app",
        },
        quota: {
          monitoredContainers: 8,
          limit: 25,
        },
      },
    };
  }
  const endpointUrl = options?.refresh
    ? url("api/hub/status?refresh=true")
    : url("api/hub/status");
  const response = await fetch(endpointUrl, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Hub status: ${response.statusText}`);
  }
  return response.json();
}
