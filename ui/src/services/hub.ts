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

export type RiskScore =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'unknown'
  | 'pending'
  | 'unsupported'
  | 'locked';

export type EnvVarChangeType = 'added' | 'removed' | 'modified' | 'deprecated';

export interface EnvVarChange {
  name: string;
  changeType: EnvVarChangeType;
  description: string;
}

export interface IntermediateReleaseItem {
  tag: string;
  name?: string;
  publishedAt?: string;
  isTarget: boolean;
  summary?: string;
  breakingChanges?: string[];
  url?: string;
}

export interface RiskAnalysisResult {
  imageRef: string;
  currentTag: string;
  targetTag: string;
  riskScore: RiskScore;
  skippedVersionsCount?: number;
  intermediateReleases?: IntermediateReleaseItem[];
  breakingChanges: string[];
  envVarChanges: EnvVarChange[];
  databaseImpact: string | null;
  summary: string;
  cached?: boolean;
  evaluatedAt?: string;
  freemiumGated?: boolean;
  trialActivationUrl?: string;
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

export async function evaluateContainerRisk(
  containerId: string,
  forceRefresh?: boolean,
): Promise<RiskAnalysisResult> {
  if (isDemoMode()) {
    return {
      imageRef: "redis",
      currentTag: "7.0.15",
      targetTag: "7.2.4",
      riskScore: "high",
      skippedVersionsCount: 2,
      intermediateReleases: [
        {
          tag: "7.2.0",
          name: "Redis 7.2.0",
          publishedAt: "2023-08-15T00:00:00.000Z",
          isTarget: false,
          summary: "Major release introducing new ACLs and RESP3 protocol defaults",
          breakingChanges: ["RESP3 protocol enabled by default", "Old ACL syntax removed"],
          url: "https://github.com/redis/redis/releases/tag/7.2.0",
        },
        {
          tag: "7.2.4",
          name: "Redis 7.2.4",
          publishedAt: "2024-01-10T00:00:00.000Z",
          isTarget: true,
          summary: "Security and stability fixes",
          breakingChanges: [],
          url: "https://github.com/redis/redis/releases/tag/7.2.4",
        },
      ],
      breakingChanges: [
        "RESP3 protocol enabled by default",
        "Old ACL syntax removed",
      ],
      envVarChanges: [
        {
          name: "REDIS_PASSWORD",
          changeType: "modified",
          description: "Requires explicit default user mapping in redis.conf",
        },
      ],
      databaseImpact: "AOF and RDB format upgrade on startup (non-reversible)",
      summary: "Multi-version upgrade jumping from 7.0 to 7.2 with protocol and storage changes",
      cached: false,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const query = forceRefresh ? "?forceRefresh=true" : "";
  const endpointUrl = url(`api/containers/${encodeURIComponent(containerId)}/risk-analysis${query}`);
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ forceRefresh: Boolean(forceRefresh) }),
  });
  if (!response.ok) {
    throw new Error(`Failed to evaluate container risk: ${response.statusText}`);
  }
  return response.json();
}
