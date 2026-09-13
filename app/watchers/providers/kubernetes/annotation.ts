/**
 * WUD supported Kubernetes annotations.
 * Canonical prefix: getwud.app/
 * Supported aliases: wud/, wud.getwud.io/
 */

export const ANNOTATION_PREFIX_CANONICAL = 'getwud.app/';
export const ANNOTATION_PREFIX_SHORT = 'wud/';
export const ANNOTATION_PREFIX_LEGACY = 'wud.getwud.io/';

export const ANNOTATION_PREFIXES = [
    ANNOTATION_PREFIX_CANONICAL,
    ANNOTATION_PREFIX_SHORT,
    ANNOTATION_PREFIX_LEGACY,
];

// Base key names without prefix:
export const KEY_WATCH = 'watch';
export const KEY_TAG_INCLUDE = 'tag.include';
export const KEY_TAG_EXCLUDE = 'tag.exclude';
export const KEY_TAG_TRANSFORM = 'tag.transform';
export const KEY_WATCH_DIGEST = 'watch.digest';
export const KEY_LINK_TEMPLATE = 'link.template';
export const KEY_DISPLAY_NAME = 'display.name';
export const KEY_DISPLAY_ICON = 'display.icon';
export const KEY_TRIGGER_INCLUDE = 'trigger.include';
export const KEY_TRIGGER_EXCLUDE = 'trigger.exclude';
export const KEY_STACK = 'stack';

// Canonical constants for direct references
export const wudWatch = `${ANNOTATION_PREFIX_CANONICAL}${KEY_WATCH}`;
export const wudTagInclude = `${ANNOTATION_PREFIX_CANONICAL}${KEY_TAG_INCLUDE}`;
export const wudTagExclude = `${ANNOTATION_PREFIX_CANONICAL}${KEY_TAG_EXCLUDE}`;
export const wudTagTransform = `${ANNOTATION_PREFIX_CANONICAL}${KEY_TAG_TRANSFORM}`;
export const wudWatchDigest = `${ANNOTATION_PREFIX_CANONICAL}${KEY_WATCH_DIGEST}`;
export const wudLinkTemplate = `${ANNOTATION_PREFIX_CANONICAL}${KEY_LINK_TEMPLATE}`;
export const wudDisplayName = `${ANNOTATION_PREFIX_CANONICAL}${KEY_DISPLAY_NAME}`;
export const wudDisplayIcon = `${ANNOTATION_PREFIX_CANONICAL}${KEY_DISPLAY_ICON}`;
export const wudTriggerInclude = `${ANNOTATION_PREFIX_CANONICAL}${KEY_TRIGGER_INCLUDE}`;
export const wudTriggerExclude = `${ANNOTATION_PREFIX_CANONICAL}${KEY_TRIGGER_EXCLUDE}`;
export const wudStack = `${ANNOTATION_PREFIX_CANONICAL}${KEY_STACK}`;

/**
 * Get an annotation value by checking prefixes in order (canonical -> short -> legacy),
 * supporting container-specific overrides (${prefix}${key}.${containerName}).
 */
export function getAnnotationValue(
    annotations: Record<string, string> | undefined | null,
    key: string,
    containerName?: string,
): string | undefined {
    if (!annotations) return undefined;

    // 1. Check container-specific override first across all prefixes
    if (containerName) {
        for (const prefix of ANNOTATION_PREFIXES) {
            const containerKey = `${prefix}${key}.${containerName}`;
            if (annotations[containerKey] !== undefined) {
                return annotations[containerKey];
            }
        }
    }

    // 2. Check base key across all prefixes
    for (const prefix of ANNOTATION_PREFIXES) {
        const baseKey = `${prefix}${key}`;
        if (annotations[baseKey] !== undefined) {
            return annotations[baseKey];
        }
    }

    return undefined;
}
