// @ts-nocheck
/**
 * Semver utils.
 */
import semver from 'semver';
import log from '../log';

/**
 * Known architecture and platform patterns that may prefix a tag.
 */
export const ARCH_PLATFORM_PREFIX_REGEX =
    /^(?:(?:linux|windows|darwin|alpine)[-_])?(?:(?:amd64|arm64(?:v\d+)?|armv\d+[a-z]*|armhf|armel|i[3-6]86|x86_64|x86|32bit|64bit|ppc64le|s390x|mips64le|riscv64|windowsltsc\d*|win\d+|nanoserver)[-_]?)+/i;

/**
 * Return true if tag appears to be a pre-release (rc, beta, alpha, preview, dev).
 */
export function isPrerelease(tag) {
    if (!tag || typeof tag !== 'string') {
        return false;
    }
    return (
        /(?:^|[-._])(rc|beta|alpha|preview|dev)\d*(?:[-._]|$)/i.test(tag) ||
        /\d+(?:rc|beta|alpha|preview|dev)\d*/i.test(tag)
    );
}

/**
 * Extract prefix, version, suffix, and flavor from a tag.
 */
export function extractTagComponents(tag) {
    if (!tag || typeof tag !== 'string') {
        return {
            prefix: '',
            version: '',
            suffix: '',
            flavor: '',
            isPrerelease: false,
        };
    }

    let remaining = tag.trim();
    let prefix = '';

    // 1. Detect and separate architecture/platform prefix (e.g. "linux-amd64-", "amd64-")
    const archMatch = remaining.match(ARCH_PLATFORM_PREFIX_REGEX);
    if (archMatch) {
        prefix = archMatch[0];
        remaining = remaining.substring(prefix.length);
    }

    // 2. Detect common version prefix (e.g. "v", "version-", "release-", or other letter prefix before version)
    const verPrefixMatch = remaining.match(/^([a-zA-Z_-]+[-_]|v(?=\d))/);
    if (verPrefixMatch) {
        prefix += verPrefixMatch[0];
        remaining = remaining.substring(verPrefixMatch[0].length);
    }

    // 3. Extract version and suffix
    // Look for numeric sequence (e.g. 1.2.3, 16.3, 4.0.13.2932, or bare 8)
    const verMatch = remaining.match(/^(\d+(?:\.\d+)*)(.*)$/);
    let version = '';
    let suffix = '';

    if (verMatch) {
        version = verMatch[1];
        suffix = verMatch[2];
    } else {
        const looseMatch = remaining.match(/^(\d+)(.*)$/);
        if (looseMatch) {
            version = looseMatch[1];
            suffix = looseMatch[2];
        } else {
            version = remaining;
            suffix = '';
        }
    }

    // 4. Extract flavor from suffix
    let flavor = '';
    if (suffix) {
        const cleanSuffix = suffix.replace(/^[-_.]/, '');
        // If suffix has no letters (e.g. 09-01 dates) or is a git commit hash, it is not an OS/distro flavor
        const isGitHash =
            /^[0-9a-f]{7,40}$/i.test(cleanSuffix) &&
            /[a-f]/i.test(cleanSuffix) &&
            /\d/.test(cleanSuffix);
        const hasLetters = /[a-zA-Z]/.test(cleanSuffix);

        if (hasLetters && !isGitHash) {
            const flavorMatch = cleanSuffix.match(
                /^([a-zA-Z]+(?:[-_][a-zA-Z]+)*)/,
            );
            flavor = flavorMatch ? flavorMatch[1].toLowerCase() : '';
        }
    }

    return {
        prefix,
        version,
        suffix,
        flavor,
        isPrerelease: isPrerelease(tag),
    };
}

/**
 * Parse a string to a semver (return null is it cannot be parsed as a valid semver).
 * @param rawVersion
 * @returns {*|SemVer}
 */
export function parse(rawVersion) {
    if (rawVersion === null || rawVersion === undefined) {
        throw new Error('Invalid version: null or undefined');
    }
    if (typeof rawVersion !== 'string' || rawVersion.trim() === '') {
        return null;
    }

    const trimmed = rawVersion.trim();

    // 1. Reject branch names (e.g. fix__69, feature__502_specific_triggers, bugfix/123)
    if (
        /^(?:fix|feature|feat|bugfix|hotfix|chore|docs|refactor|test|revert|ci|build|pr|pull)[-_/]/i.test(
            trimmed,
        )
    ) {
        return null;
    }

    // 2. Reject git commit hashes (e.g. 13696b1, 98239515-ls42, cf1f086c-ls51)
    if (
        /^[0-9a-f]{7,40}$/i.test(trimmed) &&
        /[a-f]/i.test(trimmed) &&
        /\d/.test(trimmed)
    ) {
        return null;
    }
    if (/^[0-9a-f]{7,40}-ls\d+$/i.test(trimmed)) {
        return null;
    }

    // 3. Strip architecture and platform prefixes (e.g. linux-amd64-, windowsltsc2022-amd64-, amd64-, 32bit-)
    let versionToParse = trimmed;
    if (ARCH_PLATFORM_PREFIX_REGEX.test(trimmed)) {
        versionToParse = trimmed.replace(ARCH_PLATFORM_PREFIX_REGEX, '');
        // If nothing or no digits remain after stripping architecture, not a version (e.g. 32bit-stretch -> stretch)
        if (!/\d/.test(versionToParse)) {
            return null;
        }
    }

    // 4. Try strict semver clean and parse first
    const rawVersionCleaned = semver.clean(versionToParse);
    const rawVersionSemver = semver.parse(
        rawVersionCleaned !== null ? rawVersionCleaned : versionToParse,
    );
    // Hurrah!
    if (rawVersionSemver !== null) {
        return rawVersionSemver;
    }

    // 5. Try loose clean ONLY if the version does not contain 4 or more numeric segments.
    // node-semver's loose clean regex matches 'X.Y.Z.W' by matching a single digit for Z and
    // treating the remainder as a loose prerelease without a hyphen (e.g. '4.0.13.2932' -> '4.0.1-3.2932').
    // Skipping loose clean for 4+ segment versions prevents this corruption.
    if (!/^\D*\d+(\.\d+){3,}/.test(versionToParse)) {
        const looseCleaned = semver.clean(versionToParse, { loose: true });
        if (looseCleaned !== null) {
            const looseSemver = semver.parse(looseCleaned, { loose: true });
            if (looseSemver !== null) {
                return looseSemver;
            }
        }
    }

    // 6. Last chance: try to coerce (with loose: true to tolerate leading zeros like 2025.08.05 or 1.02.03).
    // All data behind patch digit will be lost.
    return semver.coerce(versionToParse, { loose: true });
}

/**
 * Return true if version1 is semver greater than version2.
 * @param version1
 * @param version2
 */
export function isGreater(version1, version2) {
    const version1Semver = parse(version1);
    const version2Semver = parse(version2);

    // No comparison possible
    if (version1Semver === null || version2Semver === null) {
        return false;
    }

    // CalVer vs SemVer boundary check (#866, #335):
    // If current tag is standard SemVer (major < 100), do not propose 4-digit CalVer tags (>= 2000) or Ubuntu CalVer tags
    if (version2Semver.major < 100 && version1Semver.major >= 2000) {
        return false;
    }
    if (
        version2Semver.major < 100 &&
        typeof version1 === 'string' &&
        /^\d{2}\.0\d(?:\.|$)/.test(version1)
    ) {
        // e.g. 20.04.1 (Ubuntu CalVer tag)
        return false;
    }

    const comp1 = extractTagComponents(version1);
    const comp2 = extractTagComponents(version2);

    // Channel stability check:
    // If current tag is stable and candidate is a pre-release, candidate must NOT upgrade current tag.
    if (comp1.isPrerelease && !comp2.isPrerelease) {
        return false;
    }

    // Base semver equality (major, minor, patch match):
    const sameBase =
        version1Semver.major === version2Semver.major &&
        version1Semver.minor === version2Semver.minor &&
        version1Semver.patch === version2Semver.patch;

    if (sameBase) {
        // 1. Bare tag vs variant tag:
        // When SemVer versions are equal, a bare tag ('8') MUST NOT be superseded by a variant tag ('8-foo').
        // In SemVer specification, a version without prerelease/build suffix has higher precedence
        // than one with a prerelease suffix, and a bare release is the canonical base.
        const v1HasSuffix = Boolean(comp1.suffix);
        const v2HasSuffix = Boolean(comp2.suffix);

        if (v1HasSuffix && !v2HasSuffix) {
            return false;
        }
        if (!v1HasSuffix && v2HasSuffix) {
            return true;
        }

        // 2. Different flavors (e.g. 8.8-trixie vs 8.8-alpine):
        if (
            !comp1.isPrerelease &&
            !comp2.isPrerelease &&
            comp1.flavor &&
            comp2.flavor &&
            comp1.flavor !== comp2.flavor
        ) {
            return false;
        }

        // 3. Fallback to numeric-aware string comparison:
        // This handles:
        // - Dates like 2025-09-01 vs 2025-08-05
        // - Multi-part build tags (e.g. 4.0.13.2933-ls275 vs 4.0.13.2932-ls274)
        // - Alphanumeric suffixes like p14 vs p13 (numeric chunks compared numerically)
        // - Extension versions like 18-vectorchord1.1.2 vs 18-vectorchord1.1.1
        return (
            version1.localeCompare(version2, undefined, { numeric: true }) > 0
        );
    }

    // Different base versions:
    // Flavor preservation: if both are stable releases and have non-matching flavors, reject drift
    if (
        !comp1.isPrerelease &&
        !comp2.isPrerelease &&
        comp1.flavor !== comp2.flavor
    ) {
        return false;
    }

    return semver.gt(version1Semver, version2Semver);
}

/**
 * Diff between 2 semver versions.
 * @param version1
 * @param version2
 * @returns {*|string|null}
 */
export function diff(version1, version2) {
    const version1Semver = parse(version1);
    const version2Semver = parse(version2);

    // No diff possible
    if (version1Semver === null || version2Semver === null) {
        return null;
    }
    return semver.diff(version1Semver, version2Semver);
}

/**
 * Transform a tag using a formula.
 * @param transformFormula
 * @param originalTag
 * @return {*}
 */
export function transform(transformFormula, originalTag) {
    // No formula ? return original tag value
    if (!transformFormula || transformFormula === '') {
        return originalTag;
    }
    try {
        const transformFormulaSplit = transformFormula.split(/\s*=>\s*/);
        const transformRegex = new RegExp(transformFormulaSplit[0]);
        const placeholders = transformFormulaSplit[1].match(/\$\d+/g);
        const originalTagMatches = originalTag.match(transformRegex);

        let transformedTag = transformFormulaSplit[1];
        placeholders.forEach((placeholder) => {
            const placeholderIndex = Number.parseInt(
                placeholder.substring(1),
                10,
            );
            transformedTag = transformedTag.replace(
                new RegExp(placeholder.replace('$', '\\$'), 'g'),
                // An optional capture group may not participate in the match
                // (for example an optional group in the formula). Substitute
                // an empty string for it, rather than letting replace() coerce
                // undefined into the literal "undefined" and corrupt the tag.
                originalTagMatches[placeholderIndex] !== undefined
                    ? originalTagMatches[placeholderIndex]
                    : '',
            );
        });
        return transformedTag;
    } catch (e) {
        // Upon error; log & fallback to original tag value
        log.warn(
            `Error when applying transform function [${transformFormula}]to tag [${originalTag}]`,
        );
        log.debug(e);
        return originalTag;
    }
}
