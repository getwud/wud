/**
 * WUD supported Kubernetes annotations.
 * All annotations use the prefix: wud.getwud.io/
 */

/** Should the workload be tracked? (true | false). */
export const wudWatch = 'wud.getwud.io/watch';

/** Optional regex indicating what tags to consider. */
export const wudTagInclude = 'wud.getwud.io/tag.include';

/** Optional regex indicating what tags to not consider. */
export const wudTagExclude = 'wud.getwud.io/tag.exclude';

/** Optional transform function to apply to the tag. */
export const wudTagTransform = 'wud.getwud.io/tag.transform';

/** Should the image digest be tracked? (true | false). */
export const wudWatchDigest = 'wud.getwud.io/watch.digest';

/** Optional templated string pointing to a browsable link. */
export const wudLinkTemplate = 'wud.getwud.io/link.template';

/**
 * Optional friendly name to display (per container, suffix with container name).
 * Example: wud.getwud.io/display.name.nginx = "My Nginx"
 * Or for the first/only container: wud.getwud.io/display.name
 */
export const wudDisplayName = 'wud.getwud.io/display.name';

/** Optional friendly icon to display. */
export const wudDisplayIcon = 'wud.getwud.io/display.icon';

/** Optional list of triggers to include. */
export const wudTriggerInclude = 'wud.getwud.io/trigger.include';

/** Optional list of triggers to exclude. */
export const wudTriggerExclude = 'wud.getwud.io/trigger.exclude';

/** Optional stack/project label (namespace is used by default). */
export const wudStack = 'wud.getwud.io/stack';
