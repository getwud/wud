// @ts-nocheck
import log from '../log';
import * as semver from './index';

describe('parse', () => {
    const validVersions = [
        {
            input: '1.2.3',
            expected: { major: 1, minor: 2, patch: 3, prerelease: [] },
        },
        {
            input: 'v1.2.3',
            expected: { major: 1, minor: 2, patch: 3, prerelease: [] },
        },
        {
            input: 'v1.2.3-alpha1',
            expected: { major: 1, minor: 2, patch: 3, prerelease: ['alpha1'] },
        },
        {
            input: '0.6.12-ls132',
            expected: { major: 0, minor: 6, patch: 12, prerelease: ['ls132'] },
        },
        {
            input: 'linux-amd64-2.11.1-alpine',
            expected: { major: 2, minor: 11, patch: 1, prerelease: ['alpine'] },
        },
        {
            input: 'amd64-2.1.0',
            expected: { major: 2, minor: 1, patch: 0, prerelease: [] },
        },
        {
            input: 'windowsltsc2022-amd64-2.9.3',
            expected: { major: 2, minor: 9, patch: 3, prerelease: [] },
        },
        {
            input: 'version-zobi-1.2.3-alpha1',
            expected: { major: 1, minor: 2, patch: 3, prerelease: [] },
        },
        {
            input: 'v2.0.6.3-2.0.6.3_beta_2021-06-17-ls112',
            expected: { major: 2, minor: 0, patch: 6, prerelease: [] },
        },
        {
            input: '4.0.13.2932-ls274',
            expected: { major: 4, minor: 0, patch: 13, prerelease: [] },
        },
        {
            input: '4.0.9.1000-ls50',
            expected: { major: 4, minor: 0, patch: 9, prerelease: [] },
        },
        {
            input: '4.0.20.3014-ls325',
            expected: { major: 4, minor: 0, patch: 20, prerelease: [] },
        },
        {
            input: '2025.08.05',
            expected: { major: 2025, minor: 8, patch: 5, prerelease: [] },
        },
        {
            input: '1.02.03',
            expected: { major: 1, minor: 2, patch: 3, prerelease: [] },
        },
        {
            input: '1.2.3alpha',
            expected: { major: 1, minor: 2, patch: 3, prerelease: ['alpha'] },
        },
    ];

    test.each(validVersions)(
        'should parse valid semver: $input',
        ({ input, expected }) => {
            expect(semver.parse(input)).toEqual(
                expect.objectContaining(expected),
            );
        },
    );

    const invalidVersions = [
        'latest',
        'stable',
        'main',
        'invalid',
        '',
        'fix__50',
        'fix__69',
        'feature__502_specific_triggers',
        '32bit-stretch',
        '13696b1',
        'cf1f086c-ls51',
        '98239515-ls42',
    ];

    test.each(invalidVersions)(
        'should return null for invalid version: %s',
        (input) => {
            expect(semver.parse(input)).toBeNull();
        },
    );

    test('should handle null input gracefully', async () => {
        expect(() => semver.parse(null)).toThrow();
    });

    test('should handle undefined input gracefully', async () => {
        expect(() => semver.parse(undefined)).toThrow();
    });
});

describe('isGreater', () => {
    const comparisonTests = [
        // Equal versions
        { v1: '1.2.3', v2: '1.2.3', expected: false, desc: 'equal versions' },

        // Dates (fallback to string comparison)
        {
            v1: '2025-09-01',
            v2: '2025-08-05',
            expected: true,
            desc: 'newer date',
        },
        {
            v1: '2025-06-03',
            v2: '2025-08-05',
            expected: false,
            desc: 'older date',
        },

        // Major version differences
        {
            v1: '2.0.0',
            v2: '1.9.9',
            expected: true,
            desc: 'higher major version',
        },
        {
            v1: '1.0.0',
            v2: '2.0.0',
            expected: false,
            desc: 'lower major version',
        },

        // Minor version differences
        {
            v1: '1.3.0',
            v2: '1.2.9',
            expected: true,
            desc: 'higher minor version',
        },
        {
            v1: '1.2.0',
            v2: '1.3.0',
            expected: false,
            desc: 'lower minor version',
        },

        // Patch version differences
        {
            v1: '1.2.4',
            v2: '1.2.3',
            expected: true,
            desc: 'higher patch version',
        },
        {
            v1: '1.2.3',
            v2: '1.2.4',
            expected: false,
            desc: 'lower patch version',
        },

        // Prerelease versions
        {
            v1: '1.2.3',
            v2: '1.2.3-alpha1',
            expected: true,
            desc: 'release vs prerelease',
        },
        {
            v1: '1.2.3-alpha1',
            v2: '1.2.3',
            expected: false,
            desc: 'prerelease vs release',
        },
        {
            v1: '1.2.3-beta1',
            v2: '1.2.3-alpha1',
            expected: true,
            desc: 'beta vs alpha prerelease',
        },

        // Invalid versions
        {
            v1: 'latest',
            v2: '1.2.3',
            expected: false,
            desc: 'invalid vs valid version',
        },
        {
            v1: '1.2.3',
            v2: 'latest',
            expected: false,
            desc: 'valid vs invalid version',
        },
        {
            v1: 'latest',
            v2: 'stable',
            expected: false,
            desc: 'both invalid versions',
        },

        // Multi-part (4-segment) tags (e.g. LinuxServer Sonarr tags)
        {
            v1: '4.0.13.2932-ls274',
            v2: '4.0.9.1000-ls50',
            expected: true,
            desc: '4-part tag with 2-digit patch vs 1-digit patch',
        },
        {
            v1: '4.0.9.1000-ls50',
            v2: '4.0.13.2932-ls274',
            expected: false,
            desc: '4-part tag with 1-digit patch vs 2-digit patch',
        },
        {
            v1: '4.0.20.3014-ls325',
            v2: '4.0.13.2932-ls274',
            expected: true,
            desc: '4-part tag higher patch',
        },
        {
            v1: '4.0.13.2933-ls275',
            v2: '4.0.13.2932-ls274',
            expected: true,
            desc: '4-part tag same patch newer build/revision',
        },
        {
            v1: '4.0.13.2932-ls274',
            v2: '4.0.13.2933-ls275',
            expected: false,
            desc: '4-part tag same patch older build/revision',
        },
        {
            v1: '4.0.13.1000-ls274',
            v2: '4.0.13.999-ls274',
            expected: true,
            desc: 'numeric-aware comparison with different digit lengths',
        },
        {
            v1: '4.0.13.999-ls274',
            v2: '4.0.13.1000-ls274',
            expected: false,
            desc: 'numeric-aware comparison with fewer digits',
        },
        {
            v1: '2025.08.05',
            v2: '2025.08.04',
            expected: true,
            desc: 'CalVer dot-dates with leading zeros',
        },

        // Bare major tags vs variant/architecture tags (#1278, #1271)
        {
            v1: '32bit-stretch',
            v2: '8',
            expected: false,
            desc: 'architecture tag with leading digits vs bare major tag',
        },
        {
            v1: '8-libreoffice-cloudrun',
            v2: '8',
            expected: false,
            desc: 'variant tag vs bare major tag',
        },
        {
            v1: '8',
            v2: '8-libreoffice-cloudrun',
            expected: true,
            desc: 'bare major tag vs variant tag',
        },
        {
            v1: '9',
            v2: '8',
            expected: true,
            desc: 'bare major tag upgrade',
        },
        {
            v1: '2-slim-rootless',
            v2: '2',
            expected: false,
            desc: 'variant tag vs bare tag',
        },

        // OS flavor drift (#1109, #509, #514)
        {
            v1: '8.8-trixie',
            v2: '8.8-alpine',
            expected: false,
            desc: 'different OS flavors with same version',
        },
        {
            v1: '8.9-alpine',
            v2: '8.8-alpine',
            expected: true,
            desc: 'same OS flavor with higher minor version',
        },
        {
            v1: '17.2-bullseye',
            v2: '16.3',
            expected: false,
            desc: 'flavor variant vs bare version',
        },
        {
            v1: '17.2',
            v2: '16.3',
            expected: true,
            desc: 'bare version upgrade',
        },

        // Numeric suffix ordering (Checkmk #1276)
        {
            v1: '2.5.0p9',
            v2: '2.5.0p13',
            expected: false,
            desc: 'numeric patchlevel p9 vs p13',
        },
        {
            v1: '2.5.0p14',
            v2: '2.5.0p13',
            expected: true,
            desc: 'numeric patchlevel p14 vs p13',
        },

        // Pre-release vs stable channel (#883, #759, #69)
        {
            v1: '2025.12-rc2',
            v2: '2025.10',
            expected: false,
            desc: 'prerelease vs stable release',
        },
        {
            v1: '18rc1-trixie',
            v2: '18.0-trixie',
            expected: false,
            desc: 'prerelease vs stable release of same version',
        },
        {
            v1: '18.1-trixie',
            v2: '18.0-trixie',
            expected: true,
            desc: 'stable patch release within same flavor',
        },

        // Branches and git commit hashes (#71, #69, #530)
        {
            v1: '13696b1',
            v2: '2021.9.1',
            expected: false,
            desc: 'git commit hash vs CalVer release',
        },
        {
            v1: 'fix__69',
            v2: '5.7.0',
            expected: false,
            desc: 'branch tag with issue number vs release',
        },

        // Legacy CalVer vs SemVer (#866, #335)
        {
            v1: '2021.12.16',
            v2: '10.11.4',
            expected: false,
            desc: 'legacy 4-digit CalVer tag vs SemVer release',
        },
        {
            v1: '20.04.1',
            v2: '4.6.2',
            expected: false,
            desc: 'legacy Ubuntu CalVer tag vs SemVer release',
        },
        {
            v1: '20.04.1',
            v2: '2.4.1',
            expected: false,
            desc: 'legacy Ubuntu CalVer tag vs SemVer release (#1361)',
        },
        {
            v1: '24.04.9-1.1',
            v2: '24.04.8-1.1',
            expected: true,
            desc: 'upgrading 2-digit CalVer to newer 2-digit CalVer (#1361)',
        },
        {
            v1: '24.04.9',
            v2: '24.04.8',
            expected: true,
            desc: 'upgrading 2-digit CalVer to newer 2-digit CalVer (#1361)',
        },

        // Architecture-prefixed versions (#135, #625)
        {
            v1: 'windowsltsc2022-amd64-2.9.3',
            v2: '2.27.1',
            expected: false,
            desc: 'windows platform prefixed version vs linux release',
        },
        {
            v1: 'linux-amd64-2.13.1-alpine',
            v2: 'linux-amd64-2.11.1-alpine',
            expected: true,
            desc: 'arch-prefixed higher minor version',
        },
        {
            v1: 'linux-amd64-2.9.3-alpine',
            v2: 'linux-amd64-2.11.1-alpine',
            expected: false,
            desc: 'arch-prefixed lower minor version',
        },

        // 4-segment versions (Emby #375)
        {
            v1: '4.9.0.12',
            v2: '4.9.0.9',
            expected: true,
            desc: '4-segment version 12 vs 9',
        },
        {
            v1: '4.9.0.9',
            v2: '4.9.0.12',
            expected: false,
            desc: '4-segment version 9 vs 12',
        },
    ];

    test.each(comparisonTests)(
        'should handle $desc: $v1 >= $v2 = $expected',
        ({ v1, v2, expected }) => {
            expect(semver.isGreater(v1, v2)).toBe(expected);
        },
    );
});

describe('diff', () => {
    const diffTests = [
        // Same versions
        {
            v1: '1.2.3',
            v2: '1.2.3',
            expected: null,
            desc: 'identical versions',
        },

        // Different levels
        {
            v1: '1.2.3',
            v2: '2.2.3',
            expected: 'major',
            desc: 'major version difference',
        },
        {
            v1: '1.2.3',
            v2: '1.3.3',
            expected: 'minor',
            desc: 'minor version difference',
        },
        {
            v1: '1.2.3',
            v2: '1.2.4',
            expected: 'patch',
            desc: 'patch version difference',
        },

        // Prerelease differences
        {
            v1: '1.2.3',
            v2: '1.2.3-alpha1',
            expected: 'patch',
            desc: 'release vs prerelease',
        },
        {
            v1: '1.2.3-alpha1',
            v2: '1.2.3-beta1',
            expected: 'prerelease',
            desc: 'different prereleases',
        },

        // Invalid versions
        {
            v1: '1.2.3',
            v2: 'latest',
            expected: null,
            desc: 'valid vs invalid version',
        },
        {
            v1: 'latest',
            v2: '1.2.3',
            expected: null,
            desc: 'invalid vs valid version',
        },
        {
            v1: 'latest',
            v2: 'stable',
            expected: null,
            desc: 'both invalid versions',
        },
    ];

    test.each(diffTests)(
        'should detect $desc: diff($v1, $v2) = $expected',
        ({ v1, v2, expected }) => {
            expect(semver.diff(v1, v2)).toBe(expected);
        },
    );
});

describe('transform', () => {
    describe('valid transformations', () => {
        const validTransforms = [
            {
                formula: '^(\\d+\\.\\d+\\.\\d+-\\d+)-.*$ => $1',
                input: '1.2.3-99-xyz',
                expected: '1.2.3-99',
                desc: 'extract version with build number',
            },
            {
                formula: '^(\\d+\\.\\d+\\.\\d+-\\d+)-.*$=>$1',
                input: '1.2.3-99-xyz',
                expected: '1.2.3-99',
                desc: 'formula without spaces around =>',
            },
            {
                formula: '^(\\d+\\.\\d+)-.*-(\\d+) => $1.$2',
                input: '1.2-xyz-3',
                expected: '1.2.3',
                desc: 'combine version parts',
            },
            {
                formula: '^v(.+)$ => $1',
                input: 'v1.2.3',
                expected: '1.2.3',
                desc: 'remove v prefix',
            },
        ];

        test.each(validTransforms)(
            'should $desc',
            ({ formula, input, expected }) => {
                expect(semver.transform(formula, input)).toBe(expected);
            },
        );
    });

    describe('edge cases', () => {
        test('should return original tag when formula is undefined', async () => {
            expect(semver.transform(undefined, '1.2.3')).toBe('1.2.3');
        });

        test('should return original tag when formula is empty string', async () => {
            expect(semver.transform('', '1.2.3')).toBe('1.2.3');
        });

        test('should return original tag when formula is invalid', async () => {
            expect(semver.transform('invalid-formula', '1.2.3')).toBe('1.2.3');
        });

        test('should handle formula with no matches', async () => {
            expect(semver.transform('^nomatch$ => $1', '1.2.3')).toBe('1.2.3');
        });

        test('should handle malformed regex', async () => {
            expect(semver.transform('[invalid-regex => $1', '1.2.3')).toBe(
                '1.2.3',
            );
        });

        test('should substitute an empty string for an unmatched optional capture group', async () => {
            // The formula references group 4, an optional group that does not
            // participate when the tag has no suffix. It must not leak the
            // literal "undefined" into the transformed tag.
            expect(
                semver.transform('^(\\d+)-(\\d+)(-(a|b))?$ => $2.$1-$4', '3-4'),
            ).toBe('4.3-');
        });
    });

    describe('error logging with container name (#752)', () => {
        let warnSpy;

        beforeEach(() => {
            warnSpy = jest.spyOn(log, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            warnSpy.mockRestore();
        });

        test('should include container name in warning log when container name is a string', () => {
            semver.transform('[invalid-regex => $1', '1.2.3', 'my-container');
            expect(warnSpy).toHaveBeenCalledWith(
                'Error when applying transform function [[invalid-regex => $1] to tag [1.2.3] for container [my-container]',
            );
        });

        test('should include container name in warning log when container object is provided', () => {
            semver.transform('^nomatch$ => $1', '4.0.5', {
                name: 'web-app',
            });
            expect(warnSpy).toHaveBeenCalledWith(
                'Error when applying transform function [^nomatch$ => $1] to tag [4.0.5] for container [web-app]',
            );
        });

        test('should include container id in warning log when container has id but no name', () => {
            semver.transform('invalid-formula', '1.0.0', {
                id: 'container-id-123',
            });
            expect(warnSpy).toHaveBeenCalledWith(
                'Error when applying transform function [invalid-formula] to tag [1.0.0] for container [container-id-123]',
            );
        });

        test('should log error without container suffix when no container context is provided', () => {
            semver.transform('invalid-formula', '1.0.0');
            expect(warnSpy).toHaveBeenCalledWith(
                'Error when applying transform function [invalid-formula] to tag [1.0.0]',
            );
        });
    });
});

describe('integration tests', () => {
    test('should handle complete semver workflow', async () => {
        const versions = ['1.0.0', '1.1.0', '2.0.0-alpha', '2.0.0', '2.1.0'];
        const parsed = versions.map((v) => semver.parse(v)).filter(Boolean);

        expect(parsed).toHaveLength(5);
        expect(semver.isGreater('2.1.0', '1.0.0')).toBe(true);
        expect(semver.diff('1.0.0', '2.0.0')).toBe('major');
    });

    test('should handle Docker-style tags', async () => {
        const dockerTags = [
            'nginx:1.21',
            'nginx:1.21.6',
            'nginx:1.21.6-alpine',
        ];
        const transformed = dockerTags.map((tag) =>
            semver.transform('^[^:]+:(.+)$ => $1', tag),
        );

        expect(transformed).toEqual(['1.21', '1.21.6', '1.21.6-alpine']);
    });
});

describe('interpolateTagFilter', () => {
    const makeContainer = (tagValue: string, isSemver = true) => ({
        id: 'c1',
        name: 'test-container',
        displayName: 'test-container',
        displayIcon: 'mdi:docker',
        status: 'running',
        watcher: 'docker',
        image: {
            id: 'img1',
            registry: { name: 'hub', url: 'registry-1.docker.io' },
            name: 'library/test',
            tag: { value: tagValue, semver: isSemver },
            digest: { watch: false },
            architecture: 'amd64',
            os: 'linux',
        },
    });

    describe('backward compatibility', () => {
        test('should return pattern untouched when no variables are present', () => {
            const container = makeContainer('1.2.3');
            expect(
                semver.interpolateTagFilter('^1\\.2\\.\\d+$', container),
            ).toBe('^1\\.2\\.\\d+$');
        });

        test('should return null or undefined filterPattern untouched', () => {
            const container = makeContainer('1.2.3');
            expect(
                semver.interpolateTagFilter(null as any, container),
            ).toBeNull();
            expect(
                semver.interpolateTagFilter(undefined as any, container),
            ).toBeUndefined();
            expect(semver.interpolateTagFilter('', container)).toBe('');
        });

        test('should leave unknown variables untouched', () => {
            const container = makeContainer('1.2.3');
            expect(
                semver.interpolateTagFilter('^${foo}-${major}$', container),
            ).toBe('^${foo}-1$');
        });
    });

    describe('semver variable interpolation', () => {
        test('should interpolate major, minor, patch, version for standard semver', () => {
            const container = makeContainer('1.2.3');
            expect(
                semver.interpolateTagFilter(
                    '^${major}\\.${minor}\\.${patch}$',
                    container,
                ),
            ).toBe('^1\\.2\\.3$');
            expect(semver.interpolateTagFilter('^${version}$', container)).toBe(
                '^1.2.3$',
            );
        });

        test('should interpolate correctly for prefixed semver (e.g. v2.4.1)', () => {
            const container = makeContainer('v2.4.1');
            expect(
                semver.interpolateTagFilter(
                    '^${prefix}${major}\\.${minor}\\.\\d+$',
                    container,
                ),
            ).toBe('^v2\\.4\\.\\d+$');
            expect(semver.interpolateTagFilter('^${version}$', container)).toBe(
                '^2.4.1$',
            );
        });

        test('should interpolate correctly for zero segments', () => {
            const container = makeContainer('0.0.1');
            expect(
                semver.interpolateTagFilter('^${major}\\.${minor}$', container),
            ).toBe('^0\\.0$');
            expect(semver.interpolateTagFilter('^${version}$', container)).toBe(
                '^0.0.1$',
            );
        });
    });

    describe('tag components interpolation', () => {
        test('should interpolate prefix (v, release-, none)', () => {
            expect(
                semver.interpolateTagFilter(
                    '^${prefix}\\d+$',
                    makeContainer('v1.0.0'),
                ),
            ).toBe('^v\\d+$');
            expect(
                semver.interpolateTagFilter(
                    '^${prefix}\\d+$',
                    makeContainer('release-3.0.0'),
                ),
            ).toBe('^release-\\d+$');
            expect(
                semver.interpolateTagFilter(
                    '^${prefix}\\d+$',
                    makeContainer('1.0.0'),
                ),
            ).toBe('^\\d+$');
        });

        test('should interpolate flavor (alpine3.20, bookworm, slim, alpine)', () => {
            expect(
                semver.interpolateTagFilter(
                    '^\\d+\\.\\d+-${flavor}$',
                    makeContainer('3.12-alpine3.20'),
                ),
            ).toBe('^\\d+\\.\\d+-alpine3.20$');
            expect(
                semver.interpolateTagFilter(
                    '^\\d+-${flavor}$',
                    makeContainer('15-bookworm'),
                ),
            ).toBe('^\\d+-bookworm$');
            expect(
                semver.interpolateTagFilter(
                    '^\\d+-${flavor}$',
                    makeContainer('20-slim'),
                ),
            ).toBe('^\\d+-slim$');
            expect(
                semver.interpolateTagFilter(
                    '^\\d+\\.\\d+-${flavor}$',
                    makeContainer('8.8-alpine'),
                ),
            ).toBe('^\\d+\\.\\d+-alpine$');
            expect(
                semver.interpolateTagFilter(
                    '^${flavor}$',
                    makeContainer('1.2.3'),
                ),
            ).toBe('^$');
        });

        test('should interpolate prerelease (rc.1, beta1, preview, none)', () => {
            expect(
                semver.interpolateTagFilter(
                    '^${version}-${prerelease}$',
                    makeContainer('1.2.3-rc.1'),
                ),
            ).toBe('^1.2.3-rc.1$');
            expect(
                semver.interpolateTagFilter(
                    '^${version}-${prerelease}$',
                    makeContainer('1.2.3-beta1'),
                ),
            ).toBe('^1.2.3-beta1$');
            expect(
                semver.interpolateTagFilter(
                    '^${version}-${prerelease}$',
                    makeContainer('1.2.3'),
                ),
            ).toBe('^1.2.3-$');
        });

        test('should interpolate raw and original image tag values', () => {
            const container = makeContainer('2.11.1-alpine');
            expect(semver.interpolateTagFilter('^${raw}$', container)).toBe(
                '^2.11.1-alpine$',
            );
            expect(
                semver.interpolateTagFilter('^${original}$', container),
            ).toBe('^2.11.1-alpine$');
        });
    });

    describe('non-semver edge cases', () => {
        test('should replace semver variables with (?!) and not match any tag when tag is non-semver', () => {
            const container = makeContainer('latest', false);
            const interpolated = semver.interpolateTagFilter(
                '^${major}\\.${minor}\\.\\d+$',
                container,
            );
            expect(interpolated).toBe('^(?!)\\.(?!)\\.\\d+$');

            const regex = new RegExp(interpolated);
            expect(regex.test('latest')).toBe(false);
            expect(regex.test('1.2.3')).toBe(false);
            expect(regex.test('')).toBe(false);
        });

        test('should replace ${version} with (?!) when tag is non-semver', () => {
            const container = makeContainer('stable', false);
            const interpolated = semver.interpolateTagFilter(
                '^${version}$',
                container,
            );
            expect(interpolated).toBe('^(?!)$');

            const regex = new RegExp(interpolated);
            expect(regex.test('stable')).toBe(false);
            expect(regex.test('1.0.0')).toBe(false);
        });

        test('should still resolve raw and original for non-semver tags', () => {
            const container = makeContainer('latest', false);
            expect(semver.interpolateTagFilter('^${raw}$', container)).toBe(
                '^latest$',
            );
            expect(
                semver.interpolateTagFilter('^${original}$', container),
            ).toBe('^latest$');
        });

        test('should handle missing container, image or tag gracefully', () => {
            expect(semver.interpolateTagFilter('^${raw}$', null as any)).toBe(
                '^$',
            );
            expect(semver.interpolateTagFilter('^${major}$', {} as any)).toBe(
                '^(?!)$',
            );
        });
    });

    describe('regex backslash preservation', () => {
        test('should preserve regex escape sequences like \\d, \\., \\w, \\s', () => {
            const container = makeContainer('v1.2.3-alpine3.20');
            const pattern =
                '^${prefix}${major}\\.${minor}\\.\\d+-(?:${flavor}|\\w+)$';
            const interpolated = semver.interpolateTagFilter(
                pattern,
                container,
            );

            expect(interpolated).toBe('^v1\\.2\\.\\d+-(?:alpine3.20|\\w+)$');

            const regex = new RegExp(interpolated);
            expect(regex.test('v1.2.4-alpine3.20')).toBe(true);
            expect(regex.test('v1.2.99-bookworm')).toBe(true);
            expect(regex.test('v1.3.0-alpine3.20')).toBe(false);
        });
    });
});
