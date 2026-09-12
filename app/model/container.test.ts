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
});
