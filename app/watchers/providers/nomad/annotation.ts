/**
 * WUD supported Nomad metadata keys.
 * Canonical prefix: getwud.app/
 * Supported prefixes: getwud.app/, getwud.app., wud., wud/, wud.getwud.io/
 */

export const NOMAD_META_PREFIX_CANONICAL = 'getwud.app/';
export const NOMAD_META_PREFIX_SHORT = 'wud.';

export const NOMAD_META_PREFIXES = [
    'getwud.app/',
    'getwud.app.',
    'wud.',
    'wud/',
    'wud.getwud.io/',
];

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

/**
 * Get a metadata value checking per-task override and all supported prefixes.
 */
export function getMetaValue(
    meta: Record<string, string> | undefined | null,
    baseKey: string,
    canonicalKeyOrTaskName?: string,
    taskName?: string,
): string | undefined {
    if (!meta) return undefined;

    // Normalize actual taskName if 3-argument or 4-argument call
    const actualTaskName =
        taskName ??
        (canonicalKeyOrTaskName &&
        !canonicalKeyOrTaskName.includes('/') &&
        !canonicalKeyOrTaskName.includes('.')
            ? canonicalKeyOrTaskName
            : undefined);

    // Strip any known prefix if a full key like 'wud.watch' or 'getwud.app/watch' was passed as baseKey
    let rawKey = baseKey;
    for (const p of NOMAD_META_PREFIXES) {
        if (rawKey.startsWith(p)) {
            rawKey = rawKey.substring(p.length);
            break;
        }
    }

    // 1. Check per-task override across all prefixes
    if (actualTaskName) {
        for (const prefix of NOMAD_META_PREFIXES) {
            const candidate = `${prefix}${rawKey}.${actualTaskName}`;
            if (meta[candidate] !== undefined) {
                return meta[candidate];
            }
        }
    }

    // 2. Check base key across all prefixes
    for (const prefix of NOMAD_META_PREFIXES) {
        const candidate = `${prefix}${rawKey}`;
        if (meta[candidate] !== undefined) {
            return meta[candidate];
        }
    }

    // 3. Fallback direct check for the exact keys passed
    if (meta[baseKey] !== undefined) {
        return meta[baseKey];
    }
    if (canonicalKeyOrTaskName && meta[canonicalKeyOrTaskName] !== undefined) {
        return meta[canonicalKeyOrTaskName];
    }

    return undefined;
}
