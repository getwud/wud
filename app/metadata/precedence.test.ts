import { applyContainerPrecedence } from './precedence';
import { Container } from '../model/container';
import { RemoteSettingsResponse } from './types';
import {
    wudTagInclude,
    wudDisplayIcon,
    wudLinkTemplate,
} from '../watchers/providers/docker/label';

describe('applyContainerPrecedence', () => {
    function createBaseContainer(
        labels: Record<string, string> = {},
    ): Container {
        return {
            id: 'cont-1',
            name: 'test-postgres',
            displayName: 'Postgres',
            displayIcon: 'mdi:docker',
            status: 'running',
            watcher: 'local',
            updateAvailable: false,
            updateKind: { kind: 'unknown' },
            image: {
                id: 'sha256:123',
                name: 'library/postgres',
                tag: { value: '16.1', semver: true },
                digest: { watch: false },
                architecture: 'amd64',
                os: 'linux',
                registry: { name: 'hub', url: 'https://index.docker.io/v1/' },
            },
            labels,
        };
    }

    test('Strict precedence: explicit container labels override Hub settings', () => {
        const container = createBaseContainer({
            [wudTagInclude]: '^16\\.1',
            [wudDisplayIcon]: 'si:custom-postgres',
            [wudLinkTemplate]: 'https://custom-doc.example.com',
        });

        const hubSettings: RemoteSettingsResponse = {
            image: 'library/postgres',
            tagFilterRegex: '^16\\.\\d+-alpine',
            iconUrl: 'si:postgresql',
            documentationUrl: 'https://www.postgresql.org/docs/',
            upstreamUrl: 'https://github.com/postgres/postgres',
            isOfficial: true,
            recommendedStrategy: 'semver',
        };

        const result = applyContainerPrecedence(container, hubSettings);

        expect(result.includeTags).toBe('^16\\.1');
        expect(result.displayIcon).toBe('si:custom-postgres');
        expect(result.hub?.sources.includeTags).toBe('label');
        expect(result.hub?.sources.displayIcon).toBe('label');
        expect(result.hub?.sources.link).toBe('label');
        expect(result.hub?.isOfficial).toBe(true);
        expect(result.hub?.enriched).toBe(true);
        expect(result.hub?.hubDetails?.originalHubRegex).toBe(
            '^16\\.\\d+-alpine',
        );
    });

    test('Hub resolution applied when no container labels are present', () => {
        const container = createBaseContainer();

        const hubSettings: RemoteSettingsResponse = {
            image: 'library/postgres',
            tagFilterRegex: '^16\\.\\d+$',
            iconUrl: 'si:postgresql',
            documentationUrl: 'https://www.postgresql.org/docs/',
            upstreamUrl: 'https://github.com/postgres/postgres',
            isOfficial: true,
            recommendedStrategy: 'semver',
            changelogUrl: 'https://www.postgresql.org/docs/release/',
        };

        const result = applyContainerPrecedence(container, hubSettings);

        expect(result.includeTags).toBe('^16\\.\\d+$');
        expect(result.displayIcon).toBe('si:postgresql');
        expect(result.link).toBe('https://www.postgresql.org/docs/');
        expect(result.isOfficial).toBe(true);
        expect(result.documentationUrl).toBe(
            'https://www.postgresql.org/docs/',
        );
        expect(result.upstreamUrl).toBe('https://github.com/postgres/postgres');
        expect(result.changelogUrl).toBe(
            'https://www.postgresql.org/docs/release/',
        );
        expect(result.hub?.sources.includeTags).toBe('hub');
        expect(result.hub?.sources.displayIcon).toBe('hub');
        expect(result.hub?.sources.link).toBe('hub');
        expect(result.hub?.isOfficial).toBe(true);
        expect(result.hub?.enriched).toBe(true);
        expect(result.hub?.hubDetails?.documentationUrl).toBe(
            'https://www.postgresql.org/docs/',
        );
        expect(result.hub?.hubDetails?.changelogUrl).toBe(
            'https://www.postgresql.org/docs/release/',
        );
    });

    test('Fallback to defaults when hubSettings is null', () => {
        const container = createBaseContainer();

        const result = applyContainerPrecedence(container, null);

        expect(result.includeTags).toBeUndefined();
        expect(result.displayIcon).toBe('mdi:docker');
        expect(result.link).toBeUndefined();
        expect(result.hub?.enriched).toBe(false);
        expect(result.hub?.isOfficial).toBe(false);
        expect(result.hub?.sources.includeTags).toBe('default');
        expect(result.hub?.sources.displayIcon).toBe('default');
        expect(result.hub?.sources.link).toBe('default');
        expect(result.hub?.hubDetails).toBeUndefined();
    });

    test('Upstream URL used as link when documentationUrl is missing', () => {
        const container = createBaseContainer();

        const hubSettings: RemoteSettingsResponse = {
            image: 'redis',
            upstreamUrl: 'https://github.com/redis/redis',
        };

        const result = applyContainerPrecedence(container, hubSettings);

        expect(result.link).toBe('https://github.com/redis/redis');
        expect(result.upstreamUrl).toBe('https://github.com/redis/redis');
        expect(result.hub?.sources.link).toBe('hub');
    });

    test('Explicit container labels for rich metadata override Hub values', () => {
        const container = createBaseContainer({
            'wud.link.doc': 'https://custom-doc.example.com',
            'wud.link.changelog': 'https://custom-changelog.example.com',
            'wud.link.upstream': 'https://custom-upstream.example.com',
        });
        container.documentationUrl = 'https://custom-doc.example.com';
        container.changelogUrl = 'https://custom-changelog.example.com';
        container.upstreamUrl = 'https://custom-upstream.example.com';

        const hubSettings: RemoteSettingsResponse = {
            image: 'library/postgres',
            documentationUrl: 'https://hub-doc.example.com',
            changelogUrl: 'https://hub-changelog.example.com',
            upstreamUrl: 'https://hub-upstream.example.com',
            isOfficial: true,
        };

        const result = applyContainerPrecedence(container, hubSettings);

        expect(result.documentationUrl).toBe('https://custom-doc.example.com');
        expect(result.changelogUrl).toBe(
            'https://custom-changelog.example.com',
        );
        expect(result.upstreamUrl).toBe('https://custom-upstream.example.com');
        expect(result.isOfficial).toBe(true);
    });
});
