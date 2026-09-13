/**
 * WUD supported Docker Swarm labels.
 * Canonical prefix: getwud.app/
 * Supported prefixes: getwud.app/, wud., wud/, wud.getwud.io/
 */

export const SWARM_LABEL_PREFIX_CANONICAL = 'getwud.app/';
export const SWARM_LABEL_PREFIX_SHORT = 'wud.';

export const SWARM_LABEL_PREFIXES = [
    'getwud.app/',
    'wud.',
    'wud/',
    'wud.getwud.io/',
];

// Swarm specific labels
export const dockerStackNamespace = 'com.docker.stack.namespace';
export const dockerStackImage = 'com.docker.stack.image';

// Base key names
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
export const KEY_WATCH_DELAY = 'watch.delay';
export const KEY_TAG_DELAY = 'tag.delay';

// Backward compatibility constants
export const wudWatch = 'wud.watch';
export const wudWatchCanonical = 'getwud.app/watch';

export const wudTagInclude = 'wud.tag.include';
export const wudTagIncludeCanonical = 'getwud.app/tag.include';

export const wudTagExclude = 'wud.tag.exclude';
export const wudTagExcludeCanonical = 'getwud.app/tag.exclude';

export const wudTagTransform = 'wud.tag.transform';
export const wudTagTransformCanonical = 'getwud.app/tag.transform';

export const wudWatchDigest = 'wud.watch.digest';
export const wudWatchDigestCanonical = 'getwud.app/watch.digest';

export const wudLinkTemplate = 'wud.link.template';
export const wudLinkTemplateCanonical = 'getwud.app/link.template';

export const wudDisplayName = 'wud.display.name';
export const wudDisplayNameCanonical = 'getwud.app/display.name';

export const wudDisplayIcon = 'wud.display.icon';
export const wudDisplayIconCanonical = 'getwud.app/display.icon';

export const wudTriggerInclude = 'wud.trigger.include';
export const wudTriggerIncludeCanonical = 'getwud.app/trigger.include';

export const wudTriggerExclude = 'wud.trigger.exclude';
export const wudTriggerExcludeCanonical = 'getwud.app/trigger.exclude';

export const wudStack = 'wud.stack';
export const wudStackCanonical = 'getwud.app/stack';

export const wudWatchDelay = 'wud.watch.delay';
export const wudTagDelay = 'wud.tag.delay';

/**
 * Get a label value by checking all supported prefixes.
 */
export function getLabelValue(
    labels: Record<string, string> | undefined | null,
    baseKey: string,
): string | undefined {
    if (!labels) return undefined;

    // Strip known prefix if passed as baseKey
    let rawKey = baseKey;
    for (const p of SWARM_LABEL_PREFIXES) {
        if (rawKey.startsWith(p)) {
            rawKey = rawKey.substring(p.length);
            break;
        }
    }

    // 1. Check all supported prefixes
    for (const prefix of SWARM_LABEL_PREFIXES) {
        const candidate = `${prefix}${rawKey}`;
        if (labels[candidate] !== undefined) {
            return labels[candidate];
        }
    }

    // 2. Fallback direct check
    if (labels[baseKey] !== undefined) {
        return labels[baseKey];
    }

    return undefined;
}
