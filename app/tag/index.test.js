const semver = require('./index');

const parseTestCases = [
    {
        raw: '1.2.3',
        parsed: {
            major: 1,
            minor: 2,
            patch: 3,
            prerelease: [],
        },
    },
    {
        raw: 'v1.2.3',
        parsed: {
            major: 1,
            minor: 2,
            patch: 3,
            prerelease: [],
        },
    },
    {
        raw: 'v1.2.3-alpha1',
        parsed: {
            major: 1,
            minor: 2,
            patch: 3,
            prerelease: ['alpha1'],
        },
    },
    {
        raw: 'version-zobi-1.2.3-alpha1',
        parsed: {
            major: 1,
            minor: 2,
            patch: 3,
            prerelease: [],
        },
    },
    {
        raw: 'latest',
        parsed: null,
    },
    {
        raw: 'fix__50',
        parsed: {
            major: 50,
            minor: 0,
            patch: 0,
            prerelease: [],
        },
    },
    {
        raw: 'v2.0.6.3-2.0.6.3_beta_2021-06-17-ls112',
        parsed: {
            major: 2,
            minor: 0,
            patch: 6,
            prerelease: [],
        },
    },
    {
        raw: '0.6.12-ls132',
        parsed: {
            major: 0,
            minor: 6,
            patch: 12,
            prerelease: ['ls132'],
        },
    },
];

test.each(parseTestCases)('parse $raw should return $parsed', (item) => {
    if (item.parsed === null) {
        expect(semver.parse(item.raw)).toBeNull();
    } else {
        expect(semver.parse(item.raw)).toEqual(
            expect.objectContaining(item.parsed),
        );
    }
});

const isGreaterTestCases = [
    {
        version1: '1.2.3',
        version2: '1.2.3',
        greater: true,
    },
    {
        version1: '4.5.6',
        version2: '1.2.3',
        greater: true,
    },
    {
        version1: '1.2.3',
        version2: '4.5.6',
        greater: false,
    },
    {
        version1: '1.2.3-alpha1',
        version2: '1.2.3',
        greater: false,
    },
    {
        version1: '1.2.3-beta1',
        version2: '1.2.3-alpha1',
        greater: true,
    },
    {
        version1: '4.5.6-alpha1',
        version2: '1.2.3-alpha1',
        greater: true,
    },
    {
        version1: 'latest',
        version2: '1.2.3',
        greater: false,
    },
    {
        version1: '1.2.3',
        version2: 'latest',
        greater: false,
    },
];

test.each(isGreaterTestCases)(
    '$version1 isGreater $version2 should return $greater',
    (item) => {
        expect(semver.isGreater(item.version1, item.version2)).toEqual(
            item.greater,
        );
    },
);

const diffTestCases = [
    {
        version1: '1.2.3',
        version2: '4.5.6',
        diff: 'major',
    },
    {
        version1: '1.2.3',
        version2: '1.2.3',
        diff: null,
    },
    {
        version1: '1.2.3',
        version2: '1.3.3',
        diff: 'minor',
    },
    {
        version1: '1.2.3',
        version2: '1.2.4',
        diff: 'patch',
    },
    {
        version1: '1.2.3',
        version2: '1.2.3-alpha1',
        diff: 'patch',
    },
    {
        version1: '1.2.3',
        version2: 'latest',
        diff: null,
    },
    {
        version1: 'latest',
        version2: '1.2.3',
        diff: null,
    },
];

test.each(diffTestCases)(
    'diff $version1 $version2 should return $result',
    (item) => {
        expect(semver.diff(item.version1, item.version2)).toEqual(item.diff);
    },
);

const transformTestCases = [
    {
        formula: '^(\\d+\\.\\d+\\.\\d+-\\d+)-.*$ => $1',
        originalTag: '1.2.3-99-xyz',
        resultTag: '1.2.3-99',
    },
    {
        formula: '^(\\d+\\.\\d+\\.\\d+-\\d+)-.*$=>$1',
        originalTag: '1.2.3-99-xyz',
        resultTag: '1.2.3-99',
    },
    {
        formula: '^(\\d+\\.\\d+)-.*-(\\d+) => $1.$2',
        originalTag: '1.2-xyz-3',
        resultTag: '1.2.3',
    },
    {
        formula: undefined,
        originalTag: '1.2.3',
        resultTag: '1.2.3',
    },
    {
        formula: 'azerty',
        originalTag: '1.2.3',
        resultTag: '1.2.3',
    },
];

test.each(transformTestCases)(
    'transform with formula $formula should transform $originalTag to $resultTag',
    (item) => {
        expect(semver.transform(item.formula, item.originalTag)).toEqual(
            item.resultTag,
        );
    },
);
