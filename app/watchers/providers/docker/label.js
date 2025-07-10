/**
 * WUD supported Docker labels.
 */
module.exports = {
    /**
     * Should the container be tracked? (true | false).
     */
    wudWatch: 'wud.watch',

    /**
     * Optional regex indicating what tags to consider.
     */
    wudTagInclude: 'wud.tag.include',

    /**
     * Optional regex indicating what tags to not consider.
     */
    wudTagExclude: 'wud.tag.exclude',

    /**
     * Optional transform function to apply to the tag.
     */
    wudTagTransform: 'wud.tag.transform',

    /**
     * Optional path of docker inspect object where to find current semver.
     */
    wudInspectTagPath: 'wud.inspect.tag.path',

    /**
     * Should container digest be tracked? (true | false).
     */
    wudWatchDigest: 'wud.watch.digest',

    /**
     * Optional templated string pointing to a browsable link.
     */
    wudLinkTemplate: 'wud.link.template',

    /**
     * Optional friendly name to display.
     */
    wudDisplayName: 'wud.display.name',

    /**
     * Optional friendly icon to display.
     */
    wudDisplayIcon: 'wud.display.icon',

    /**
     * Optional list of triggers to include
     */
    wudTriggerInclude: 'wud.trigger.include',

    /**
     * Optional list of triggers to exclude
     */
    wudTriggerExclude: 'wud.trigger.exclude',
};
