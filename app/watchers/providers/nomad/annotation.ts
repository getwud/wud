/**
 * WUD supported Nomad metadata keys.
 * Supports both idiomatic Nomad keys (wud.<key>) and standard keys (wud.getwud.io/<key>).
 */

export const wudWatch = 'wud.watch';
export const wudWatchCanonical = 'wud.getwud.io/watch';

export const wudTagInclude = 'wud.tag.include';
export const wudTagIncludeCanonical = 'wud.getwud.io/tag.include';

export const wudTagExclude = 'wud.tag.exclude';
export const wudTagExcludeCanonical = 'wud.getwud.io/tag.exclude';

export const wudTagTransform = 'wud.tag.transform';
export const wudTagTransformCanonical = 'wud.getwud.io/tag.transform';

export const wudWatchDigest = 'wud.watch.digest';
export const wudWatchDigestCanonical = 'wud.getwud.io/watch.digest';

export const wudLinkTemplate = 'wud.link.template';
export const wudLinkTemplateCanonical = 'wud.getwud.io/link.template';

export const wudDisplayName = 'wud.display.name';
export const wudDisplayNameCanonical = 'wud.getwud.io/display.name';

export const wudDisplayIcon = 'wud.display.icon';
export const wudDisplayIconCanonical = 'wud.getwud.io/display.icon';

export const wudTriggerInclude = 'wud.trigger.include';
export const wudTriggerIncludeCanonical = 'wud.getwud.io/trigger.include';

export const wudTriggerExclude = 'wud.trigger.exclude';
export const wudTriggerExcludeCanonical = 'wud.getwud.io/trigger.exclude';

export const wudStack = 'wud.stack';
export const wudStackCanonical = 'wud.getwud.io/stack';

/**
 * Get a metadata value checking per-task override, standard key, and canonical key.
 */
export function getMetaValue(
    meta: Record<string, string> | undefined | null,
    baseKey: string,
    canonicalKey: string,
    taskName?: string,
): string | undefined {
    if (!meta) return undefined;
    if (taskName) {
        if (meta[`${baseKey}.${taskName}`] !== undefined) {
            return meta[`${baseKey}.${taskName}`];
        }
        if (meta[`${canonicalKey}.${taskName}`] !== undefined) {
            return meta[`${canonicalKey}.${taskName}`];
        }
    }
    if (meta[baseKey] !== undefined) {
        return meta[baseKey];
    }
    if (meta[canonicalKey] !== undefined) {
        return meta[canonicalKey];
    }
    return undefined;
}
