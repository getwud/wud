import {
    Container,
    getFirstLabel,
    CHANGELOG_LABEL_KEYS,
    UPSTREAM_LABEL_KEYS,
    DOC_LABEL_KEYS,
    TEMPLATE_LABEL_KEYS,
} from '../model/container';
import { RemoteSettingsResponse, ContainerHubMetadata } from './types';
import {
    wudTagInclude,
    wudDisplayIcon,
    wudLinkTemplate,
} from '../watchers/providers/docker/label';

export function applyContainerPrecedence(
    container: Container,
    hubSettings: RemoteSettingsResponse | null,
): Container {
    const labels = container.labels || {};

    // 1. Tag Include Regex
    const localTagInclude = labels[wudTagInclude];
    let finalIncludeTags: string | undefined = undefined;
    let sourceIncludeTags: 'label' | 'hub' | 'default' = 'default';

    if (localTagInclude && localTagInclude.trim() !== '') {
        finalIncludeTags = localTagInclude.trim();
        sourceIncludeTags = 'label';
    } else if (
        hubSettings?.tagFilterRegex &&
        hubSettings.tagFilterRegex.trim() !== ''
    ) {
        finalIncludeTags = hubSettings.tagFilterRegex.trim();
        sourceIncludeTags = 'hub';
    } else if (container.includeTags && container.includeTags.trim() !== '') {
        finalIncludeTags = container.includeTags;
    }

    // 2. Display Icon
    const localIcon = labels[wudDisplayIcon];
    let finalIcon = 'mdi:docker';
    let sourceIcon: 'label' | 'hub' | 'default' = 'default';

    if (localIcon && localIcon.trim() !== '') {
        finalIcon = localIcon.trim();
        sourceIcon = 'label';
    } else if (hubSettings?.iconUrl && hubSettings.iconUrl.trim() !== '') {
        finalIcon = hubSettings.iconUrl.trim();
        sourceIcon = 'hub';
    } else if (
        container.displayIcon &&
        container.displayIcon !== 'mdi:docker'
    ) {
        finalIcon = container.displayIcon;
    }

    // 3. Documentation / Upstream Link & Rich Metadata
    const localLinkTemplate =
        labels[wudLinkTemplate] ||
        getFirstLabel(labels, TEMPLATE_LABEL_KEYS) ||
        container.linkTemplate;
    const localDocLabel = getFirstLabel(labels, DOC_LABEL_KEYS);
    const localChangelogLabel = getFirstLabel(labels, CHANGELOG_LABEL_KEYS);
    const localUpstreamLabel = getFirstLabel(labels, UPSTREAM_LABEL_KEYS);

    let sourceLink: 'label' | 'hub' | 'default' = 'default';

    if (localLinkTemplate && localLinkTemplate.trim() !== '') {
        sourceLink = 'label';
    } else if (hubSettings?.documentationUrl || hubSettings?.upstreamUrl) {
        sourceLink = 'hub';
    }

    // 4. Seamlessly populate first-class Container rich metadata fields
    if (hubSettings) {
        if (hubSettings.isOfficial !== undefined) {
            container.isOfficial = Boolean(
                container.isOfficial || hubSettings.isOfficial,
            );
        }

        if (
            hubSettings.documentationUrl &&
            !localDocLabel &&
            !localLinkTemplate
        ) {
            container.documentationUrl = hubSettings.documentationUrl;
        }

        if (hubSettings.changelogUrl && !localChangelogLabel) {
            container.changelogUrl = hubSettings.changelogUrl;
        }

        if (hubSettings.upstreamUrl && !localUpstreamLabel) {
            container.upstreamUrl = hubSettings.upstreamUrl;
        }

        if (sourceLink === 'hub' && !container.linkTemplate) {
            const descriptor = Object.getOwnPropertyDescriptor(
                container,
                'link',
            );
            if (!descriptor || descriptor.writable || descriptor.set) {
                container.link =
                    container.documentationUrl ||
                    container.upstreamUrl ||
                    container.link;
            }
        }
    }

    // Apply resolved values
    container.includeTags = finalIncludeTags;
    container.displayIcon = finalIcon;

    // Traceability metadata
    const hubMetadata: ContainerHubMetadata = {
        enriched: Boolean(hubSettings),
        resolvedAt: new Date().toISOString(),
        isOfficial: Boolean(container.isOfficial ?? hubSettings?.isOfficial),
        sources: {
            includeTags: sourceIncludeTags,
            displayIcon: sourceIcon,
            link: sourceLink,
        },
        hubDetails: hubSettings
            ? {
                  recommendedStrategy: hubSettings.recommendedStrategy,
                  upstreamUrl: hubSettings.upstreamUrl || undefined,
                  documentationUrl: hubSettings.documentationUrl || undefined,
                  changelogUrl: hubSettings.changelogUrl || undefined,
                  originalHubRegex: hubSettings.tagFilterRegex || undefined,
              }
            : undefined,
    };

    container.hub = hubMetadata;
    return container;
}
