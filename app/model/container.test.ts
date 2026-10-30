// @ts-nocheck
import * as container from './container';

test('model should be validated when compliant', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',

        linkTemplate: 'https://release-${major}.${minor}.${patch}.acme.com',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: '1.0.0',
                semver: true,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '2.0.0',
        },
    });

    expect(containerValidated.resultChanged.name).toEqual(
        'resultChangedFunction',
    );
    delete containerValidated.resultChanged;

    expect(containerValidated).toStrictEqual({
        id: 'container-123456789',
        status: 'unknown',
        image: {
            architecture: 'arch',
            created: '2021-06-12T05:33:38.440Z',
            digest: {
                watch: false,
                repo: undefined,
            },
            id: 'image-123456789',
            name: 'organization/image',
            os: 'os',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            tag: {
                semver: true,
                value: '1.0.0',
            },
        },
        name: 'test',
        displayName: 'test',
        displayIcon: 'mdi:docker',
        isOfficial: false,
        documentationUrl: 'https://release-1.0.0.acme.com',
        changelogUrl: undefined,
        upstreamUrl: undefined,

        linkTemplate: 'https://release-${major}.${minor}.${patch}.acme.com',
        link: 'https://release-1.0.0.acme.com',
        coolingDownUntil: undefined,
        isCoolingDown: false,
        isSnoozed: false,
        updateAvailable: true,
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
            semverDiff: 'major',
        },
        result: {
            link: 'https://release-2.0.0.acme.com',
            tag: '2.0.0',
        },
        watcher: 'test',
    });
});

test('model should not be validated when invalid', async () => {
    expect(() => {
        container.validate({});
    }).toThrow();
});

test('model should validate and preserve stack property', async () => {
    const containerValidated = container.validate({
        id: 'container-stack-1',
        name: 'test-stack',
        watcher: 'test-watcher',
        stack: 'homelab',
        image: {
            id: 'image-1',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'org/image',
            tag: {
                value: '1.0.0',
                semver: true,
            },
            digest: {
                watch: false,
            },
            architecture: 'amd64',
            os: 'linux',
        },
    });
    expect(containerValidated.stack).toBe('homelab');
});

test('model should flag updateAvailable when tag is different', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: 'x',
                semver: false,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'y',
        },
    });
    expect(containerValidated.updateAvailable).toBeTruthy();
});

test('model should not flag updateAvailable when tag is equal', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: 'x',
                semver: false,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'x',
        },
    });
    expect(containerValidated.updateAvailable).toBeFalsy();
});

test('model should not flag updateAvailable when result tag is not defined or empty (fixes #1007)', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: '1.0.0',
                semver: true,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {},
    });
    expect(containerValidated.updateAvailable).toBeFalsy();
    expect(containerValidated.updateKind.kind).toBe('unknown');
});

test('model should flag updateAvailable when digest is different', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: 'x',
                semver: false,
            },
            digest: {
                watch: true,
                repo: 'x',
                value: 'x',
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'x',
            digest: 'y',
        },
    });
    expect(containerValidated.updateAvailable).toBeTruthy();
});

test('model should flag updateAvailable when created is different', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: 'x',
                semver: false,
            },
            digest: {
                watch: true,
                repo: 'x',
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'x',
            created: '2021-06-15T05:33:38.440Z',
        },
    });
    const containerEquals = container.validate({
        ...containerValidated,
    });
    const containerDifferent = container.validate({
        ...containerValidated,
    });
    containerDifferent.result.tag = 'y';
    expect(containerValidated.resultChanged(containerEquals)).toBeFalsy();
    expect(containerValidated.resultChanged(containerDifferent)).toBeTruthy();
});

test('model should support transforms for links', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        transformTags: '^(\\d+\\.\\d+)-.*-(\\d+) => $1.$2',

        linkTemplate: 'https://release-${major}.${minor}.${patch}.acme.com',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: '1.2-foo-3',
                semver: true,
            },
            digest: {},
            architecture: 'arch',
            os: 'os',
        },
        result: {
            tag: '1.2-bar-4',
        },
    });

    expect(containerValidated).toMatchObject({
        link: 'https://release-1.2.3.acme.com',
        result: {
            link: 'https://release-1.2.4.acme.com',
        },
    });
});

test('flatten should be flatten the nested properties with underscores when called', async () => {
    const containerValidated = container.validate({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',

        linkTemplate: 'https://release-${major}.${minor}.${patch}.acme.com',
        image: {
            id: 'image-123456789',
            registry: {
                name: 'hub',
                url: 'https://hub',
            },
            name: 'organization/image',
            tag: {
                value: '1.0.0',
                semver: true,
            },
            digest: {
                watch: false,
                repo: undefined,
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '2.0.0',
        },
    });

    expect(container.flatten(containerValidated)).toEqual({
        id: 'container-123456789',
        status: 'unknown',
        image_architecture: 'arch',
        image_created: '2021-06-12T05:33:38.440Z',
        image_digest_repo: undefined,
        image_digest_watch: false,
        image_id: 'image-123456789',
        image_name: 'organization/image',
        image_os: 'os',
        image_registry_name: 'hub',
        image_registry_url: 'https://hub',
        image_tag_semver: true,
        image_tag_value: '1.0.0',
        is_official: false,
        documentation_url: 'https://release-1.0.0.acme.com',
        changelog_url: undefined,
        upstream_url: undefined,
        is_snoozed: false,
        link: 'https://release-1.0.0.acme.com',

        link_template: 'https://release-${major}.${minor}.${patch}.acme.com',
        name: 'test',
        display_name: 'test',
        display_icon: 'mdi:docker',
        result_link: 'https://release-2.0.0.acme.com',
        result_tag: '2.0.0',
        cooling_down_until: undefined,
        is_cooling_down: false,
        update_available: true,
        update_kind_kind: 'tag',
        update_kind_local_value: '1.0.0',
        update_kind_remote_value: '2.0.0',
        update_kind_semver_diff: 'major',
        watcher: 'test',
    });
});

test('fullName should build an id with watcher name & container name when called', async () => {
    expect(
        container.fullName({
            watcher: 'watcher',
            name: 'container_name',
        }),
    ).toEqual('watcher_container_name');
});

test('getLink should render link templates when called', async () => {
    const { testable_getLink: getLink } = container;
    expect(
        getLink(
            {
                linkTemplate:
                    'https://test-${major}.${minor}.${patch}.acme.com',
                image: {
                    tag: {
                        semver: true,
                    },
                },
            },
            '10.5.2',
        ),
    ).toEqual('https://test-10.5.2.acme.com');
});

test('getLink should render undefined when template is missing', async () => {
    const { testable_getLink: getLink } = container;
    expect(getLink(undefined)).toBeUndefined();
});

test('addUpdateKindProperty should detect major update', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        updateAvailable: true,
        image: {
            tag: {
                value: '1.0.0',
                semver: true,
            },
        },
        result: {
            tag: '2.0.0',
        },
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'tag',
        localValue: '1.0.0',
        remoteValue: '2.0.0',
        semverDiff: 'major',
    });
});

test('addUpdateKindProperty should detect minor update', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        updateAvailable: true,
        image: {
            tag: {
                value: '1.0.0',
                semver: true,
            },
        },
        result: {
            tag: '1.1.0',
        },
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'tag',
        localValue: '1.0.0',
        remoteValue: '1.1.0',
        semverDiff: 'minor',
    });
});

test('addUpdateKindProperty should detect patch update', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        updateAvailable: true,
        image: {
            tag: {
                value: '1.0.0',
                semver: true,
            },
        },
        result: {
            tag: '1.0.1',
        },
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'tag',
        localValue: '1.0.0',
        remoteValue: '1.0.1',
        semverDiff: 'patch',
    });
});

test('addUpdateKindProperty should support transforms', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        transformTags: '^(\\d+\\.\\d+)-.*-(\\d+) => $1.$2',
        updateAvailable: true,
        image: {
            tag: {
                value: '1.2-foo-3',
                semver: true,
            },
        },
        result: {
            tag: '1.2-bar-4',
        },
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'tag',
        localValue: '1.2-foo-3',
        remoteValue: '1.2-bar-4',
        semverDiff: 'patch',
    });
});

test('addUpdateKindProperty should detect prerelease semver update', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        updateAvailable: true,
        image: {
            tag: {
                value: '1.0.0-test1',
                semver: true,
            },
        },
        result: {
            tag: '1.0.0-test2',
        },
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'tag',
        localValue: '1.0.0-test1',
        remoteValue: '1.0.0-test2',
        semverDiff: 'prerelease',
    });
});

test('addUpdateKindProperty should detect digest update', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        updateAvailable: true,
        image: {
            tag: {
                value: 'latest',
                semver: false,
            },
            digest: {
                value: 'sha256:123465789',
            },
        },
        result: {
            tag: 'latest',
            digest: 'sha256:987654321',
        },
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'digest',
        localValue: 'sha256:123465789',
        remoteValue: 'sha256:987654321',
    });
});

test('addUpdateKindProperty should return unknown when no image or result', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {};
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'unknown',
    });
});

test('addUpdateKindProperty should return unknown when no update available', async () => {
    const { testable_addUpdateKindProperty: addUpdateKindProperty } = container;
    const containerObject = {
        image: 'image',
        result: {},
        updateAvailable: false,
    };
    addUpdateKindProperty(containerObject);
    expect(containerObject.updateKind).toEqual({
        kind: 'unknown',
    });
});

describe('snooze functionality', () => {
    const baseContainer = {
        id: 'c1',
        name: 'test-app',
        watcher: 'docker',
        image: {
            id: 'img1',
            registry: { name: 'hub', url: 'https://hub' },
            name: 'test-app',
            tag: { value: '1.0.0', semver: true },
            digest: { watch: false },
            architecture: 'amd64',
            os: 'linux',
        },
        result: {
            tag: '2.0.0',
        },
    };

    test('should mark updateAvailable=false and isSnoozed=true when snoozed indefinitely', () => {
        const validated = container.validate({
            ...baseContainer,
            snoozedVersion: '2.0.0',
        });
        expect(validated.isSnoozed).toBe(true);
        expect(validated.updateAvailable).toBe(false);
    });

    test('should mark updateAvailable=false and isSnoozed=true when snoozed until a future time', () => {
        const validated = container.validate({
            ...baseContainer,
            snoozedVersion: '2.0.0',
            snoozedUntil: Date.now() + 100000,
        });
        expect(validated.isSnoozed).toBe(true);
        expect(validated.updateAvailable).toBe(false);
    });

    test('should mark updateAvailable=true and isSnoozed=false when snooze has expired', () => {
        const validated = container.validate({
            ...baseContainer,
            snoozedVersion: '2.0.0',
            snoozedUntil: Date.now() - 1000,
        });
        expect(validated.isSnoozed).toBe(false);
        expect(validated.updateAvailable).toBe(true);
    });

    test('should mark updateAvailable=true and isSnoozed=false when a newer version appears', () => {
        const validated = container.validate({
            ...baseContainer,
            snoozedVersion: '1.5.0', // older snooze
            result: { tag: '2.0.0' },
        });
        expect(validated.isSnoozed).toBe(false);
        expect(validated.updateAvailable).toBe(true);
    });

    test('should support snoozing by digest', () => {
        const digestContainer = {
            id: 'c2',
            name: 'digest-app',
            watcher: 'docker',
            image: {
                id: 'img2',
                registry: { name: 'hub', url: 'https://hub' },
                name: 'digest-app',
                tag: { value: 'latest', semver: false },
                digest: { watch: true, value: 'sha256:old' },
                architecture: 'amd64',
                os: 'linux',
            },
            result: {
                digest: 'sha256:new',
            },
            snoozedVersion: 'sha256:new',
        };
        const validated = container.validate(digestContainer);
        expect(validated.isSnoozed).toBe(true);
        expect(validated.updateAvailable).toBe(false);
    });
});

describe('parseDurationMs', () => {
    test('should return undefined for undefined, null, or empty string', () => {
        expect(container.parseDurationMs(undefined)).toBeUndefined();
        expect(container.parseDurationMs(null)).toBeUndefined();
        expect(container.parseDurationMs('')).toBeUndefined();
        expect(container.parseDurationMs('   ')).toBeUndefined();
    });

    test('should parse raw milliseconds as number or string', () => {
        expect(container.parseDurationMs(5000)).toBe(5000);
        expect(container.parseDurationMs('5000')).toBe(5000);
        expect(container.parseDurationMs(0)).toBe(0);
        expect(container.parseDurationMs(-10)).toBeUndefined();
    });

    test('should parse seconds', () => {
        expect(container.parseDurationMs('30s')).toBe(30000);
        expect(container.parseDurationMs('10 sec')).toBe(10000);
        expect(container.parseDurationMs('1 second')).toBe(1000);
        expect(container.parseDurationMs('45 seconds')).toBe(45000);
    });

    test('should parse minutes', () => {
        expect(container.parseDurationMs('10m')).toBe(600000);
        expect(container.parseDurationMs('5 min')).toBe(300000);
        expect(container.parseDurationMs('1 minute')).toBe(60000);
        expect(container.parseDurationMs('2 minutes')).toBe(120000);
    });

    test('should parse hours', () => {
        expect(container.parseDurationMs('24h')).toBe(86400000);
        expect(container.parseDurationMs('2 hr')).toBe(7200000);
        expect(container.parseDurationMs('1 hour')).toBe(3600000);
        expect(container.parseDurationMs('3 hours')).toBe(10800000);
    });

    test('should parse days', () => {
        expect(container.parseDurationMs('3d')).toBe(259200000);
        expect(container.parseDurationMs('1 day')).toBe(86400000);
        expect(container.parseDurationMs('5 days')).toBe(432000000);
    });

    test('should parse weeks', () => {
        expect(container.parseDurationMs('1w')).toBe(604800000);
        expect(container.parseDurationMs('2 weeks')).toBe(1209600000);
    });

    test('should parse fractional values', () => {
        expect(container.parseDurationMs('1.5h')).toBe(5400000);
        expect(container.parseDurationMs('0.5d')).toBe(43200000);
    });

    test('should return undefined for invalid strings', () => {
        expect(container.parseDurationMs('invalid')).toBeUndefined();
        expect(container.parseDurationMs('10xyz')).toBeUndefined();
        expect(container.parseDurationMs('abc10m')).toBeUndefined();
    });
});

describe('cool-down delay logic', () => {
    const baseContainer = {
        id: 'container-delay-test',
        name: 'test-delay',
        watcher: 'local',
        image: {
            id: 'img-1',
            registry: { name: 'hub', url: 'https://hub' },
            name: 'app',
            tag: { value: '1.0.0', semver: true },
            digest: { watch: false },
            architecture: 'amd64',
            os: 'linux',
            created: '2023-01-01T00:00:00.000Z',
        },
    };

    test('should hold update in cool-down when remote release is within delay window', () => {
        // Released 1 hour ago, delay is 24h -> cooling down until 23h from now
        const releaseTime = new Date(Date.now() - 3600 * 1000).toISOString();
        const validated = container.validate({
            ...baseContainer,
            delay: '24h',
            result: {
                tag: '2.0.0',
                created: releaseTime,
            },
        });

        expect(validated.isCoolingDown).toBe(true);
        expect(validated.updateAvailable).toBe(false);
        expect(validated.updateKind.kind).toBe('unknown');
        expect(validated.coolingDownUntil).toBe(
            new Date(releaseTime).getTime() + 24 * 3600 * 1000,
        );
    });

    test('should mark updateAvailable=true when cool-down period has elapsed', () => {
        // Released 2 days ago, delay is 24h -> cool-down finished yesterday
        const releaseTime = new Date(
            Date.now() - 48 * 3600 * 1000,
        ).toISOString();
        const validated = container.validate({
            ...baseContainer,
            delay: '24h',
            result: {
                tag: '2.0.0',
                created: releaseTime,
            },
        });

        expect(validated.isCoolingDown).toBe(false);
        expect(validated.updateAvailable).toBe(true);
        expect(validated.updateKind.kind).toBe('tag');
        expect(validated.updateKind.semverDiff).toBe('major');
    });

    test('should not be cooling down if no candidate update exists', () => {
        // Same tag and same created date -> no update
        const validated = container.validate({
            ...baseContainer,
            delay: '24h',
            result: {
                tag: '1.0.0',
                created: baseContainer.image.created,
            },
        });

        expect(validated.isCoolingDown).toBe(false);
        expect(validated.updateAvailable).toBe(false);
    });

    test('should not be cooling down if container has no delay', () => {
        const releaseTime = new Date().toISOString();
        const validated = container.validate({
            ...baseContainer,
            result: {
                tag: '2.0.0',
                created: releaseTime,
            },
        });

        expect(validated.coolingDownUntil).toBeUndefined();
        expect(validated.isCoolingDown).toBe(false);
        expect(validated.updateAvailable).toBe(true);
    });

    test('should not be cooling down if result has no created date', () => {
        const validated = container.validate({
            ...baseContainer,
            delay: '24h',
            result: {
                tag: '2.0.0',
            },
        });

        expect(validated.coolingDownUntil).toBeUndefined();
        expect(validated.isCoolingDown).toBe(false);
        expect(validated.updateAvailable).toBe(true);
    });

    test('should handle digest updates with cool-down', () => {
        const releaseTime = new Date(Date.now() - 1000).toISOString();
        const validated = container.validate({
            ...baseContainer,
            delay: '1h',
            image: {
                ...baseContainer.image,
                tag: { value: 'latest', semver: false },
                digest: { watch: true, value: 'sha256:old', repo: 'app' },
            },
            result: {
                tag: 'latest',
                digest: 'sha256:new',
                created: releaseTime,
            },
        });

        expect(validated.isCoolingDown).toBe(true);
        expect(validated.updateAvailable).toBe(false);
    });

    test('should allow overriding cool-down to make updateAvailable=true and compute updateKind', () => {
        const releaseTime = new Date(Date.now() - 3600 * 1000).toISOString();
        const validated = container.validate({
            ...baseContainer,
            delay: '24h',
            overrideCooldown: true,
            result: {
                tag: '2.0.0',
                created: releaseTime,
            },
        });

        expect(validated.isCoolingDown).toBe(true);
        expect(validated.overrideCooldown).toBe(true);
        expect(validated.updateAvailable).toBe(true);
        expect(validated.updateKind.kind).toBe('tag');
        expect(validated.updateKind.semverDiff).toBe('major');
        expect(validated.updateKind.remoteValue).toBe('2.0.0');
    });

    test('should support dynamically overriding cool-down on an existing container instance', () => {
        const releaseTime = new Date(Date.now() - 3600 * 1000).toISOString();
        const validated = container.validate({
            ...baseContainer,
            delay: '24h',
            result: {
                tag: '2.0.0',
                created: releaseTime,
            },
        });

        expect(validated.isCoolingDown).toBe(true);
        expect(validated.updateAvailable).toBe(false);
        expect(validated.updateKind.kind).toBe('unknown');

        validated.overrideCooldown = true;
        expect(validated.updateAvailable).toBe(true);
        expect(validated.updateKind.kind).toBe('tag');
        expect(validated.updateKind.semverDiff).toBe('major');
    });
});

describe('rich container metadata', () => {
    describe('isDockerOfficialImage', () => {
        test('should return true for official docker images', () => {
            expect(
                container.isDockerOfficialImage({
                    name: 'postgres',
                    registry: { name: 'hub', url: 'https://hub' },
                } as any),
            ).toBe(true);

            expect(
                container.isDockerOfficialImage({
                    name: 'library/redis',
                    registry: { name: 'hub', url: 'https://hub' },
                } as any),
            ).toBe(true);

            expect(
                container.isDockerOfficialImage({
                    name: 'nginx',
                    registry: {
                        name: 'docker.io',
                        url: 'https://registry-1.docker.io/v2',
                    },
                } as any),
            ).toBe(true);
        });

        test('should return false for community and third-party registry images', () => {
            expect(
                container.isDockerOfficialImage({
                    name: 'linuxserver/plex',
                    registry: { name: 'hub', url: 'https://hub' },
                } as any),
            ).toBe(false);

            expect(
                container.isDockerOfficialImage({
                    name: 'app',
                    registry: { name: 'custom', url: 'http://myreg:5000' },
                } as any),
            ).toBe(false);

            expect(
                container.isDockerOfficialImage({
                    name: 'org/repo',
                    registry: { name: 'ghcr', url: 'https://ghcr.io' },
                } as any),
            ).toBe(false);
        });

        test('should safely handle missing or malformed image data', () => {
            expect(container.isDockerOfficialImage(undefined as any)).toBe(
                false,
            );
            expect(container.isDockerOfficialImage({} as any)).toBe(false);
            expect(
                container.isDockerOfficialImage({
                    name: '',
                    registry: { name: 'hub', url: 'https://hub' },
                } as any),
            ).toBe(false);
            expect(
                container.isDockerOfficialImage({
                    name: 'library/',
                    registry: { name: 'hub', url: 'https://hub' },
                } as any),
            ).toBe(false);
            expect(
                container.isDockerOfficialImage({
                    name: 'library/nested/repo',
                    registry: { name: 'hub', url: 'https://hub' },
                } as any),
            ).toBe(false);
        });
    });

    describe('resolveContainerMetadata & precedence', () => {
        const createBase = () => ({
            id: 'c-1',
            name: 'my-app',
            watcher: 'w',
            image: {
                id: 'img-1',
                name: 'library/redis',
                registry: { name: 'hub', url: 'https://hub' },
                tag: { value: '7.0.0', semver: true },
                digest: { watch: false },
                architecture: 'amd64',
                os: 'linux',
            },
        });

        test('should resolve default documentationUrl for official images when no labels or remote metadata exist', () => {
            const raw = createBase();
            const validated = container.validate(raw);

            expect(validated.isOfficial).toBe(true);
            expect(validated.documentationUrl).toBe(
                'https://hub.docker.com/_/redis',
            );
            expect(validated.changelogUrl).toBeUndefined();
            expect(validated.upstreamUrl).toBeUndefined();
            // Backward-compatibility: link points to documentationUrl
            expect(validated.link).toBe('https://hub.docker.com/_/redis');
        });

        test('should prioritize explicit container labels over defaults', () => {
            const raw = {
                ...createBase(),
                labels: {
                    'wud.link.changelog':
                        'https://github.com/redis/redis/releases',
                    'wud.link.upstream': 'https://github.com/redis/redis',
                    'wud.link.doc': 'https://redis.io/docs/',
                },
            };

            const resolved = container.resolveContainerMetadata(raw as any);

            expect(resolved.changelogUrl).toBe(
                'https://github.com/redis/redis/releases',
            );
            expect(resolved.upstreamUrl).toBe('https://github.com/redis/redis');
            expect(resolved.documentationUrl).toBe('https://redis.io/docs/');
            expect(resolved.link).toBe('https://redis.io/docs/');
            expect(resolved.isOfficial).toBe(true);
        });

        test('should support canonical getwud.app/ and alias label prefixes', () => {
            const raw = {
                ...createBase(),
                labels: {
                    'getwud.app/link.changelog':
                        'https://canonical.com/changelog',
                    'wud/link.upstream': 'https://alias.com/upstream',
                    'wud.getwud.io/link.doc': 'https://legacy.com/doc',
                },
            };

            const resolved = container.resolveContainerMetadata(raw as any);

            expect(resolved.changelogUrl).toBe(
                'https://canonical.com/changelog',
            );
            expect(resolved.upstreamUrl).toBe('https://alias.com/upstream');
            expect(resolved.documentationUrl).toBe('https://legacy.com/doc');
            expect(resolved.link).toBe('https://legacy.com/doc');
        });

        test('should interpolate variables in templated link labels', () => {
            const raw = {
                ...createBase(),
                labels: {
                    'wud.link.changelog':
                        'https://github.com/redis/redis/releases/tag/${major}.${minor}',
                    'wud.link.doc': 'https://docs.my-app.org/v/${major}',
                },
            };

            const resolved = container.resolveContainerMetadata(raw as any);

            expect(resolved.changelogUrl).toBe(
                'https://github.com/redis/redis/releases/tag/7.0',
            );
            expect(resolved.documentationUrl).toBe(
                'https://docs.my-app.org/v/7',
            );
        });

        test('should fall back to upstreamUrl when documentationUrl is not set', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    name: 'my-org/custom-app',
                },
                labels: {
                    'wud.link.upstream': 'https://github.com/my-org/custom-app',
                },
            };

            const resolved = container.resolveContainerMetadata(raw as any);

            expect(resolved.isOfficial).toBe(false);
            expect(resolved.documentationUrl).toBeUndefined();
            expect(resolved.upstreamUrl).toBe(
                'https://github.com/my-org/custom-app',
            );
            expect(resolved.link).toBe('https://github.com/my-org/custom-app');
        });

        test('should preserve existing container.link if documentationUrl and upstreamUrl are absent', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    name: 'my-org/custom-app',
                },
                link: 'https://legacy-link.com',
            };

            const resolved = container.resolveContainerMetadata(raw as any);

            expect(resolved.link).toBe('https://legacy-link.com');
        });

        test('should ignore invalid documentationUrl and not fail validation when documentationUrl is not a valid URI', () => {
            const raw = {
                ...createBase(),
                documentationUrl: 'not-a-valid-uri',
            };

            const validated = container.validate(raw);
            expect(validated.documentationUrl).toBeUndefined();
        });

        test('should allow re-validating a container with linkTemplate multiple times without throwing', () => {
            const raw = {
                ...createBase(),
                linkTemplate: 'https://example.com/${container.name}',
                result: { tag: '2.0.0' },
            };

            const validated1 = container.validate(raw);
            expect(validated1.link).toBe('https://example.com/my-app');

            // Re-validate the already validated container object (simulating store update)
            expect(() => container.validate(validated1)).not.toThrow();
            expect(validated1.link).toBe('https://example.com/my-app');
        });

        test('should resolve container.result.changelogUrl dynamically against container.result.tag', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    tag: { value: '1.0.0', semver: true },
                },
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases/tag/v${major}.${minor}.${patch}',
                },
                result: {
                    tag: '2.3.4',
                },
            };

            const resolved = container.resolveContainerMetadata(raw as any);

            expect(resolved.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v1.0.0',
            );
            expect(resolved.result?.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v2.3.4',
            );
        });

        test('should resolve container.result.changelogUrl properly in two-phase lifecycle (normalize without result, then update with result)', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    tag: { value: '1.0.0', semver: true },
                },
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases/tag/v${major}.${minor}.${patch}',
                    'wud.link.upstream':
                        'https://github.com/org/repo/tree/v${original}',
                    'wud.link.doc': 'https://docs.org.com/v${major}.${minor}',
                },
            };

            // Phase 1: normalization during initial discovery (no result)
            const normalized = container.validate(raw as any);
            expect(normalized.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v1.0.0',
            );
            expect(normalized.upstreamUrl).toBe(
                'https://github.com/org/repo/tree/v1.0.0',
            );
            expect(normalized.documentationUrl).toBe(
                'https://docs.org.com/v1.0',
            );

            // Phase 2: watcher checks update and attaches result
            normalized.result = { tag: '2.3.4' };
            const updated = container.validate(normalized);

            expect(updated.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v1.0.0',
            );
            expect(updated.result?.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v2.3.4',
            );
            expect(updated.upstreamUrl).toBe(
                'https://github.com/org/repo/tree/v1.0.0',
            );
            expect(updated.documentationUrl).toBe('https://docs.org.com/v1.0');
        });

        test('should resolve changelogUrl and result.changelogUrl when template contains ${result.tag}', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    tag: { value: '1.0.0', semver: true },
                },
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases/tag/v${result.tag}',
                },
            };

            // Phase 1: normalization without result
            const normalized = container.validate(raw as any);
            expect(normalized.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v1.0.0',
            );

            // Phase 2: update with result
            normalized.result = { tag: '2.3.4' };
            const updated = container.validate(normalized);
            expect(updated.result?.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v2.3.4',
            );
        });

        test('should preserve raw template when changelogUrl is provided directly without labels', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    tag: { value: '1.0.0', semver: true },
                },
                changelogUrl:
                    'https://github.com/org/repo/releases/tag/v${major}.${minor}.${patch}',
                upstreamUrl: 'https://github.com/org/repo/tree/v${original}',
                documentationUrl: 'https://docs.org.com/v${major}.${minor}',
            };

            // Phase 1: normalization
            const normalized = container.validate(raw as any);
            expect(normalized.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v1.0.0',
            );
            expect(normalized.upstreamUrl).toBe(
                'https://github.com/org/repo/tree/v1.0.0',
            );
            expect(normalized.documentationUrl).toBe(
                'https://docs.org.com/v1.0',
            );

            // Phase 2: update with result
            normalized.result = { tag: '2.5.0' };
            const updated = container.validate(normalized);
            expect(updated.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v1.0.0',
            );
            expect(updated.result?.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v2.5.0',
            );
            expect(updated.upstreamUrl).toBe(
                'https://github.com/org/repo/tree/v1.0.0',
            );
            expect(updated.documentationUrl).toBe('https://docs.org.com/v1.0');
        });

        test('should ignore invalid candidate changelog URL and leave it undefined', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    tag: { value: '1.0.0', semver: true },
                },
                labels: {
                    'wud.link.changelog': 'not-a-valid-uri-${raw}',
                },
                result: {
                    tag: '2.0.0',
                },
            };

            const resolved = container.resolveContainerMetadata(raw as any);
            expect(resolved.changelogUrl).toBeUndefined();
            expect(resolved.result?.changelogUrl).toBeUndefined();
        });

        test('should populate container.result.link with changelogUrl when linkTemplate is not defined (#1501)', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    tag: { value: '1.0.0', semver: true },
                },
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases/tag/v${tag}',
                },
                result: {
                    tag: '2.0.0',
                },
            };

            const validated = container.validate(raw);
            expect(validated.result?.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v2.0.0',
            );
            expect(validated.result?.link).toBe(
                'https://github.com/org/repo/releases/tag/v2.0.0',
            );
        });

        test('should fall back to container.changelogUrl for result.link when result.changelogUrl is absent (#1501)', () => {
            const raw = {
                ...createBase(),
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases',
                },
                result: {
                    digest: 'sha256:1234567890abcdef',
                },
            };

            const validated = container.validate(raw);
            expect(validated.changelogUrl).toBe(
                'https://github.com/org/repo/releases',
            );
            expect(validated.result?.link).toBe(
                'https://github.com/org/repo/releases',
            );
        });

        test('should prioritize linkTemplate over changelogUrl for container.result.link', () => {
            const raw = {
                ...createBase(),
                linkTemplate: 'https://example.com/custom/${result.tag}',
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases/tag/v${tag}',
                },
                result: {
                    tag: '3.0.0',
                },
            };

            const validated = container.validate(raw);
            expect(validated.result?.link).toBe(
                'https://example.com/custom/3.0.0',
            );
            expect(validated.result?.changelogUrl).toBe(
                'https://github.com/org/repo/releases/tag/v3.0.0',
            );
        });

        test('should fall back to changelogUrl when linkTemplate evaluates to empty', () => {
            const raw = {
                ...createBase(),
                linkTemplate: '   ',
                labels: {
                    'wud.link.changelog':
                        'https://github.com/org/repo/releases',
                },
                result: {
                    tag: '2.0.0',
                },
            };

            const validated = container.validate(raw);
            expect(validated.result?.link).toBe(
                'https://github.com/org/repo/releases',
            );
        });

        test('should preserve raw container.result.link when linkTemplate and changelogUrl are absent', () => {
            const raw = {
                ...createBase(),
                result: {
                    tag: '2.0.0',
                    link: 'https://explicit-result-link.com',
                },
            };

            const validated = container.validate(raw);
            expect(validated.result?.link).toBe(
                'https://explicit-result-link.com',
            );
        });

        test('should fall back container.link to changelogUrl when documentationUrl and upstreamUrl are absent (#1501)', () => {
            const raw = {
                ...createBase(),
                image: {
                    ...createBase().image,
                    name: 'custom/image',
                },
                labels: {
                    'wud.link.changelog':
                        'https://github.com/custom/image/releases',
                },
            };

            const validated = container.validate(raw);
            expect(validated.link).toBe(
                'https://github.com/custom/image/releases',
            );
        });
    });

    describe('hasTransitionedOutOfCooldown (#1445)', () => {
        test('should return true when container was checked during cooldown and watcher runs after cooldown expired (real dynamic getters)', () => {
            const now = Date.now();
            // result was created 3 days ago, delay is 2 days => coolingDownUntil was 1 day ago
            const resultCreated = new Date(
                now - 3 * 24 * 3600 * 1000,
            ).toISOString();
            // Container was last checked 2.5 days ago (during cooldown)
            const lastChecked = new Date(
                now - 2.5 * 24 * 3600 * 1000,
            ).toISOString();

            const containerInDb = container.validate({
                id: 'c1',
                name: 'test',
                watcher: 'docker',
                delay: '2d',
                image: {
                    id: 'img1',
                    name: 'test',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                    created: resultCreated,
                },
                checkedAt: lastChecked,
            });

            // Verify real dynamic getters evaluate against present time
            expect(containerInDb.isCoolingDown).toBe(false);
            expect(containerInDb.updateAvailable).toBe(true);

            const containerWithResult = container.validate({
                id: 'c1',
                name: 'test',
                watcher: 'docker',
                delay: '2d',
                image: {
                    id: 'img1',
                    name: 'test',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                    created: resultCreated,
                },
            });

            expect(containerWithResult.isCoolingDown).toBe(false);
            expect(containerWithResult.updateAvailable).toBe(true);

            expect(
                container.hasTransitionedOutOfCooldown(
                    containerInDb,
                    containerWithResult,
                ),
            ).toBe(true);
        });

        test('should return false on subsequent runs after cooldown has already expired (real dynamic getters)', () => {
            const now = Date.now();
            const resultCreated = new Date(
                now - 3 * 24 * 3600 * 1000,
            ).toISOString();
            // Container was checked 0.5 days ago (after cooldown already expired at now - 1 day)
            const lastChecked = new Date(
                now - 0.5 * 24 * 3600 * 1000,
            ).toISOString();

            const containerInDb = container.validate({
                id: 'c1',
                name: 'test',
                watcher: 'docker',
                delay: '2d',
                image: {
                    id: 'img1',
                    name: 'test',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                    created: resultCreated,
                },
                checkedAt: lastChecked,
                persistedUpdateAvailable: true,
            });

            const containerWithResult = container.validate({
                id: 'c1',
                name: 'test',
                watcher: 'docker',
                delay: '2d',
                image: {
                    id: 'img1',
                    name: 'test',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                    created: resultCreated,
                },
            });

            expect(
                container.hasTransitionedOutOfCooldown(
                    containerInDb,
                    containerWithResult,
                ),
            ).toBe(false);
        });

        test('should return false when update is still in cooldown on containerWithResult', () => {
            const now = Date.now();
            // result was created 1 hour ago, delay is 2 days => still cooling down
            const resultCreated = new Date(now - 3600 * 1000).toISOString();

            const containerInDb = container.validate({
                id: 'c1',
                name: 'test',
                watcher: 'docker',
                delay: '2d',
                image: {
                    id: 'img1',
                    name: 'test',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                    created: resultCreated,
                },
                checkedAt: new Date(now - 1800 * 1000).toISOString(),
            });

            const containerWithResult = container.validate({
                id: 'c1',
                name: 'test',
                watcher: 'docker',
                delay: '2d',
                image: {
                    id: 'img1',
                    name: 'test',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.0.0', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                    created: resultCreated,
                },
            });

            expect(containerWithResult.isCoolingDown).toBe(true);
            expect(containerWithResult.updateAvailable).toBe(false);

            expect(
                container.hasTransitionedOutOfCooldown(
                    containerInDb,
                    containerWithResult,
                ),
            ).toBe(false);
        });

        test('should return true with explicit mock properties', () => {
            const containerInDb = {
                id: 'c1',
                isCoolingDown: true,
                updateAvailable: false,
            };
            const containerWithResult = {
                id: 'c1',
                isCoolingDown: false,
                updateAvailable: true,
            };
            expect(
                container.hasTransitionedOutOfCooldown(
                    containerInDb as any,
                    containerWithResult as any,
                ),
            ).toBe(true);
        });

        test('should return false with explicit mock properties when update was already available', () => {
            const containerInDb = {
                id: 'c1',
                isCoolingDown: false,
                updateAvailable: true,
            };
            const containerWithResult = {
                id: 'c1',
                isCoolingDown: false,
                updateAvailable: true,
            };
            expect(
                container.hasTransitionedOutOfCooldown(
                    containerInDb as any,
                    containerWithResult as any,
                ),
            ).toBe(false);
        });
    });

    describe('safeInterpolate and template injection security (GHSA-rrhg-3h69-4fvf)', () => {
        const dummyContext = {
            major: '1',
            minor: '2',
            patch: '3',
            prerelease: 'beta.1',
            version: '1.2.3',
            original: 'v1.2.3-beta.1',
            raw: 'v1.2.3-beta.1',
            transformed: '1.2.3-beta.1',
            image: {
                name: 'my-org/my-app',
                registry: {
                    name: 'hub',
                    url: 'https://hub.docker.com',
                },
                tag: {
                    value: '1.2.3',
                    semver: true,
                },
            },
            container: {
                name: 'my-container',
                watcher: 'docker',
            },
            result: {
                tag: '2.0.0',
            },
        };

        describe('safeInterpolate unit tests', () => {
            test('should interpolate standard variables correctly', () => {
                expect(
                    container.safeInterpolate(
                        'https://github.com/my-org/my-app/releases/tag/v${major}.${minor}.${patch}',
                        dummyContext,
                    ),
                ).toBe('https://github.com/my-org/my-app/releases/tag/v1.2.3');

                expect(
                    container.safeInterpolate(
                        'https://example.com/${image.name}/${version}',
                        dummyContext,
                    ),
                ).toBe('https://example.com/my-org/my-app/1.2.3');

                expect(
                    container.safeInterpolate(
                        'https://hub.docker.com/r/${image.name}/tags?name=${result.tag}',
                        dummyContext,
                    ),
                ).toBe(
                    'https://hub.docker.com/r/my-org/my-app/tags?name=2.0.0',
                );

                expect(
                    container.safeInterpolate(
                        'https://example.com/${container.name}/${container.watcher}',
                        dummyContext,
                    ),
                ).toBe('https://example.com/my-container/docker');
            });

            test('should resolve null, undefined, objects and functions to empty string', () => {
                const contextWithComplex = {
                    ...dummyContext,
                    image: {
                        ...dummyContext.image,
                        nullProp: null,
                        undefinedProp: undefined,
                        funcProp: () => 'malicious',
                    },
                };

                // Non-primitive: image itself or nested object resolves to ''
                expect(
                    container.safeInterpolate(
                        'https://example.com/${image}',
                        contextWithComplex,
                    ),
                ).toBe('https://example.com/');

                // Null property resolves to ''
                expect(
                    container.safeInterpolate(
                        'https://example.com/${image.nullProp}',
                        contextWithComplex,
                    ),
                ).toBe('https://example.com/');

                // Undefined property resolves to ''
                expect(
                    container.safeInterpolate(
                        'https://example.com/${image.undefinedProp}',
                        contextWithComplex,
                    ),
                ).toBe('https://example.com/');

                // Non-existent property resolves to ''
                expect(
                    container.safeInterpolate(
                        'https://example.com/${image.nonExistent}',
                        contextWithComplex,
                    ),
                ).toBe('https://example.com/');

                // Function property resolves to ''
                expect(
                    container.safeInterpolate(
                        'https://example.com/${image.funcProp}',
                        contextWithComplex,
                    ),
                ).toBe('https://example.com/');
            });

            test('should throw on syntax errors in template expressions', () => {
                // Function call / IIFE
                expect(() =>
                    container.safeInterpolate(
                        '${(() => { return 1; })()}',
                        dummyContext,
                    ),
                ).toThrow(/Syntax violation/);

                // Arithmetic expression
                expect(() =>
                    container.safeInterpolate('${1+1}', dummyContext),
                ).toThrow(/Syntax violation/);

                // Invalid characters / spaces / quotes
                expect(() =>
                    container.safeInterpolate(
                        "${process.mainModule.require('child_process')}",
                        dummyContext,
                    ),
                ).toThrow(/Syntax violation/);

                // Empty expression
                expect(() =>
                    container.safeInterpolate('https://${}.com', dummyContext),
                ).toThrow(/Syntax violation/);

                // Unclosed expression
                expect(() =>
                    container.safeInterpolate(
                        'https://example.com/${major',
                        dummyContext,
                    ),
                ).toThrow(/Syntax violation/);
            });

            test('should throw on forbidden property access (prototype pollution)', () => {
                expect(() =>
                    container.safeInterpolate('${__proto__}', dummyContext),
                ).toThrow();

                expect(() =>
                    container.safeInterpolate(
                        '${container.__proto__.polluted}',
                        dummyContext,
                    ),
                ).toThrow(/Forbidden property access/);

                expect(() =>
                    container.safeInterpolate(
                        '${image.constructor.name}',
                        dummyContext,
                    ),
                ).toThrow(/Forbidden property access/);

                expect(() =>
                    container.safeInterpolate(
                        '${result.prototype.foo}',
                        dummyContext,
                    ),
                ).toThrow(/Forbidden property access/);
            });

            test('should throw on unauthorized root variables', () => {
                expect(() =>
                    container.safeInterpolate(
                        '${process.env.SECRET}',
                        dummyContext,
                    ),
                ).toThrow(/Unauthorized root variable: 'process'/);

                expect(() =>
                    container.safeInterpolate(
                        '${global.process}',
                        dummyContext,
                    ),
                ).toThrow(/Unauthorized root variable: 'global'/);

                expect(() =>
                    container.safeInterpolate('${require}', dummyContext),
                ).toThrow(/Unauthorized root variable: 'require'/);

                expect(() =>
                    container.safeInterpolate('${dummyVar}', dummyContext),
                ).toThrow(/Unauthorized root variable: 'dummyVar'/);
            });
        });

        describe('renderLinkTemplate with malicious payloads', () => {
            const testContainer = {
                id: 'c-security-test',
                name: 'sec-app',
                watcher: 'local',
                image: {
                    id: 'img-sec',
                    name: 'org/sec-app',
                    registry: { name: 'hub', url: 'https://hub' },
                    tag: { value: '1.2.3', semver: true },
                    digest: { watch: false },
                    architecture: 'amd64',
                    os: 'linux',
                },
                result: {
                    tag: '2.0.0',
                },
            } as any;

            test('should not execute code and safely fall back to template string on RCE payload', () => {
                const maliciousTemplates = [
                    '${process.mainModule.require("child_process").execSync("id")}',
                    '${(() => { process.exit(1); })()}',
                    '${1+1}',
                    'https://example.com/${process.env.PATH}',
                    '${global.console.log("hacked")}',
                ];

                for (const payload of maliciousTemplates) {
                    const rendered = container.renderLinkTemplate(
                        payload,
                        testContainer,
                    );
                    expect(rendered).toBe(payload);
                }
            });

            test('should not pollute prototype and safely fall back to template string', () => {
                const payload = "${__proto__.polluted = 'yes'}";
                const rendered = container.renderLinkTemplate(
                    payload,
                    testContainer,
                );
                expect(rendered).toBe(payload);
                expect((Object.prototype as any).polluted).toBeUndefined();
            });

            test('should render valid semver and container variables in renderLinkTemplate', () => {
                const template =
                    'https://release-${version}.acme.com/${image.name}';
                const rendered = container.renderLinkTemplate(
                    template,
                    testContainer,
                );
                expect(rendered).toBe(
                    'https://release-1.2.3.acme.com/org/sec-app',
                );
            });
        });
    });
});
