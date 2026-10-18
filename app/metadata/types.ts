export type ProviderConnectionStatus =
    | 'connected'
    | 'degraded'
    | 'error'
    | 'standalone';

export interface RemoteSettingsRequest {
    image: string;
    tag?: string;
    labels?: Record<string, string>;
}

export interface RemoteSettingsResponse {
    image: string;
    tagPattern?: string | null;
    tagFilterRegex?: string | null;
    recommendedStrategy?: 'semver' | 'date' | 'digest' | 'unknown';
    isOfficial?: boolean;
    upstreamUrl?: string | null;
    documentationUrl?: string | null;
    iconUrl?: string | null;
    changelogUrl?: string | null;
}

export interface ContainerHubMetadata {
    enriched: boolean;
    resolvedAt?: string;
    isOfficial?: boolean;
    sources: {
        includeTags: 'label' | 'hub' | 'default';
        displayIcon: 'label' | 'hub' | 'default';
        link: 'label' | 'hub' | 'default';
    };
    hubDetails?: {
        recommendedStrategy?: string;
        upstreamUrl?: string;
        documentationUrl?: string;
        changelogUrl?: string;
        originalHubRegex?: string;
    };
}

export interface HubStatusSummary {
    enabled: boolean;
    status: ProviderConnectionStatus;
    endpoint: string;
    hasKey: boolean;
    lastCheck?: string;
    errorMessage?: string;
}
