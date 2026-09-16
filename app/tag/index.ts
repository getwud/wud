// @ts-nocheck
/**
 * Semver utils.
 */
import semver from 'semver';
import log from '../log';

/**
 * Parse a string to a semver (return null is it cannot be parsed as a valid semver).
 * @param rawVersion
 * @returns {*|SemVer}
 */
export function parse(rawVersion) {
    // 1. Try strict semver clean and parse first
    const rawVersionCleaned = semver.clean(rawVersion);
    const rawVersionSemver = semver.parse(
        rawVersionCleaned !== null ? rawVersionCleaned : rawVersion,
    );
    // Hurrah!
    if (rawVersionSemver !== null) {
        return rawVersionSemver;
    }

    // 2. Try loose clean ONLY if the version does not contain 4 or more numeric segments.
    // node-semver's loose clean regex matches 'X.Y.Z.W' by matching a single digit for Z and
    // treating the remainder as a loose prerelease without a hyphen (e.g. '4.0.13.2932' -> '4.0.1-3.2932').
    // Skipping loose clean for 4+ segment versions prevents this corruption.
    if (!/^\D*\d+(\.\d+){3,}/.test(rawVersion)) {
        const looseCleaned = semver.clean(rawVersion, { loose: true });
        if (looseCleaned !== null) {
            const looseSemver = semver.parse(looseCleaned, { loose: true });
            if (looseSemver !== null) {
                return looseSemver;
            }
        }
    }

    // 3. Last chance: try to coerce (with loose: true to tolerate leading zeros like 2025.08.05 or 1.02.03).
    // All data behind patch digit will be lost.
    return semver.coerce(rawVersion, { loose: true });
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
    // If semver versions are exactly equal, fallback to numeric-aware string comparison.
    // This allows tags like 'YYYY-MM-DD' (which all coerce to YYYY.0.0) as well as
    // multi-part build tags (e.g. 4.0.13.1000 vs 4.0.13.999 or ls100 vs ls99) to be correctly ordered.
    if (semver.eq(version1Semver, version2Semver)) {
        return (
            version1.localeCompare(version2, undefined, { numeric: true }) > 0
        );
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
