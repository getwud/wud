import fs from 'fs';
import path from 'path';
import os from 'os';
import { migrateLokiToSqlite } from './migrate_loki';
import { initDatabase, closeDatabase } from './db';
import * as container from './container';
import * as app from './app';

describe('LokiJS to SQLite Migration', () => {
    let tmpDir: string;
    let sqlitePath: string;
    let lokiPath: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wud-loki-test-'));
        sqlitePath = path.join(tmpDir, 'wud.sqlite');
        lokiPath = path.join(tmpDir, 'wud.json');
        closeDatabase();
    });

    afterEach(() => {
        closeDatabase();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('should do nothing if loki file does not exist', () => {
        const { db } = initDatabase(sqlitePath);
        expect(() => migrateLokiToSqlite(lokiPath, db)).not.toThrow();
        expect(fs.existsSync(lokiPath)).toBe(false);
    });

    test('should migrate containers and app info, then rename file', () => {
        const legacyLokiContent = {
            filename: 'wud.json',
            collections: [
                {
                    name: 'app',
                    data: [{ name: 'wud', version: '5.1.0' }],
                },
                {
                    name: 'containers',
                    data: [
                        {
                            data: {
                                id: 'legacy-container-1',
                                name: 'web',
                                displayName: 'web',
                                displayIcon: 'mdi:docker',
                                status: 'running',
                                watcher: 'local',
                                image: {
                                    id: 'img-1',
                                    registry: {
                                        name: 'hub',
                                        url: 'https://hub.docker.com',
                                    },
                                    name: 'nginx',
                                    tag: {
                                        value: 'alpine',
                                        semver: false,
                                    },
                                    digest: {
                                        watch: false,
                                    },
                                    architecture: 'amd64',
                                    os: 'linux',
                                    created: '2022-01-01T00:00:00.000Z',
                                },
                                result: {
                                    tag: 'alpine-latest',
                                },
                            },
                        },
                    ],
                },
            ],
        };

        fs.writeFileSync(lokiPath, JSON.stringify(legacyLokiContent), 'utf-8');

        const { db } = initDatabase(sqlitePath);
        migrateLokiToSqlite(lokiPath, db);

        // Verify data migrated in SQLite
        const migratedContainers = container.getContainers();
        expect(migratedContainers.length).toBe(1);
        expect(migratedContainers[0].id).toBe('legacy-container-1');
        expect(migratedContainers[0].name).toBe('web');
        expect(migratedContainers[0].image.name).toBe('nginx');
        expect(migratedContainers[0].result?.tag).toBe('alpine-latest');

        const appInfo = app.getAppInfos();
        expect(appInfo?.version).toBe('5.1.0');

        // Verify original file renamed
        expect(fs.existsSync(lokiPath)).toBe(false);
        expect(fs.existsSync(`${lokiPath}.migrated`)).toBe(true);
    });

    test('should handle corrupted JSON gracefully', () => {
        fs.writeFileSync(lokiPath, '{ invalid json', 'utf-8');

        const { db } = initDatabase(sqlitePath);
        expect(() => migrateLokiToSqlite(lokiPath, db)).not.toThrow();

        expect(container.getContainers().length).toBe(0);
    });
});
