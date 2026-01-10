// @ts-nocheck
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
            input: 'fix__50',
            expected: { major: 50, minor: 0, patch: 0, prerelease: [] },
        },
        {
            input: 'version-zobi-1.2.3-alpha1',
            expected: { major: 1, minor: 2, patch: 3, prerelease: [] },
        },
        {
            input: 'v2.0.6.3-2.0.6.3_beta_2021-06-17-ls112',
            expected: { major: 2, minor: 0, patch: 6, prerelease: [] },
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

    const invalidVersions = ['latest', 'stable', 'main', 'invalid', ''];

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
        { v1: '1.2.3', v2: '1.2.3', expected: true, desc: 'equal versions' },

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
