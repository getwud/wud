import fs from 'fs';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import logger from '../log';
import * as schema from './db/schema';
import { validate as validateContainer } from '../model/container';

const log = logger.child({ component: 'store-migrate-loki' });

interface LokiCollection<T> {
    name: string;
    data: T[];
}

interface LokiDatabase {
    collections?: LokiCollection<any>[];
}

/**
 * Migrate data from a legacy LokiJS JSON file to SQLite.
 *
 * @param lokiFilePath Path to the legacy wud.json file
 * @param db Drizzle SQLite database instance
 */
export function migrateLokiToSqlite(
    lokiFilePath: string,
    db: BetterSQLite3Database<typeof schema>,
) {
    if (!fs.existsSync(lokiFilePath)) {
        return;
    }

    log.info(
        `Legacy LokiJS store detected at ${lokiFilePath}. Starting migration to SQLite...`,
    );

    let parsed: LokiDatabase;
    try {
        const rawContent = fs.readFileSync(lokiFilePath, 'utf-8');
        parsed = JSON.parse(rawContent);
    } catch (e: any) {
        log.error(
            `Failed to parse legacy LokiJS store (${lokiFilePath}): ${e.message}`,
        );
        return;
    }

    if (!parsed.collections || !Array.isArray(parsed.collections)) {
        log.warn(
            'No collections found in legacy LokiJS file. Skipping migration.',
        );
        renameLegacyFile(lokiFilePath);
        return;
    }

    const collectionsMap = new Map<string, any[]>();
    for (const col of parsed.collections) {
        if (col.name && Array.isArray(col.data)) {
            collectionsMap.set(col.name, col.data);
        }
    }

    // 1. Migrate app collection
    const appData = collectionsMap.get('app');
    if (appData && appData.length > 0) {
        const appItem = appData[0];
        if (appItem && appItem.version) {
            try {
                const existing = db
                    .select()
                    .from(schema.appInfo)
                    .where(eq(schema.appInfo.name, appItem.name || 'wud'))
                    .get();

                if (!existing) {
                    db.insert(schema.appInfo)
                        .values({
                            name: appItem.name || 'wud',
                            version: appItem.version,
                        })
                        .run();
                    log.info(
                        `Migrated app version ${appItem.version} from LokiJS`,
                    );
                }
            } catch (err: any) {
                log.warn(`Could not migrate app info: ${err.message}`);
            }
        }
    }

    // 2. Migrate containers collection
    const containersData = collectionsMap.get('containers');
    if (containersData && containersData.length > 0) {
        let migratedCount = 0;
        for (const item of containersData) {
            const rawContainer = item.data || item;
            if (!rawContainer || !rawContainer.id) {
                continue;
            }

            try {
                const validated = validateContainer(rawContainer);

                // Check if container already exists
                const existing = db
                    .select()
                    .from(schema.containers)
                    .where(eq(schema.containers.id, validated.id))
                    .get();

                if (!existing) {
                    // Insert into containers
                    db.insert(schema.containers)
                        .values({
                            id: validated.id,
                            name: validated.name,
                            displayName: validated.displayName,
                            displayIcon: validated.displayIcon,
                            status: validated.status,
                            watcher: validated.watcher,
                            includeTags: validated.includeTags,
                            excludeTags: validated.excludeTags,
                            transformTags: validated.transformTags,
                            linkTemplate: validated.linkTemplate,
                            link: validated.link,
                            triggerInclude: validated.triggerInclude,
                            triggerExclude: validated.triggerExclude,
                            labels: validated.labels,
                        })
                        .run();

                    // Insert image
                    if (validated.image) {
                        db.insert(schema.containerImages)
                            .values({
                                containerId: validated.id,
                                imageId: validated.image.id,
                                registryName: validated.image.registry.name,
                                registryUrl: validated.image.registry.url,
                                name: validated.image.name,
                                tagValue: validated.image.tag.value,
                                tagSemver: validated.image.tag.semver,
                                digestWatch: validated.image.digest.watch,
                                digestValue: validated.image.digest.value,
                                digestRepo: validated.image.digest.repo,
                                architecture: validated.image.architecture,
                                os: validated.image.os,
                                variant: validated.image.variant,
                                created: validated.image.created,
                            })
                            .run();
                    }

                    // Insert initial result history
                    if (validated.result || validated.error) {
                        db.insert(schema.containerResultsHistory)
                            .values({
                                containerId: validated.id,
                                tag: validated.result?.tag,
                                digest: validated.result?.digest,
                                created: validated.result?.created,
                                link: validated.result?.link,
                                updateAvailable: validated.updateAvailable,
                                updateKind: validated.updateKind?.kind,
                                localValue: validated.updateKind?.localValue,
                                remoteValue: validated.updateKind?.remoteValue,
                                semverDiff: validated.updateKind?.semverDiff,
                                errorMessage: validated.error?.message,
                            })
                            .run();
                    }

                    migratedCount++;
                }
            } catch (err: any) {
                log.warn(
                    `Skipping invalid container during migration (id=${rawContainer.id}): ${err.message}`,
                );
            }
        }
        log.info(`Migrated ${migratedCount} containers from LokiJS to SQLite`);
    }

    // 3. Migrate sessions collection
    const sessionsData = collectionsMap.get('Sessions');
    if (sessionsData && sessionsData.length > 0) {
        let sessionsCount = 0;
        for (const sessionItem of sessionsData) {
            if (sessionItem && sessionItem.sid && sessionItem.content) {
                try {
                    const updatedAt = sessionItem.updatedAt
                        ? new Date(sessionItem.updatedAt)
                        : new Date();
                    const expiresAt = sessionItem.content?.cookie?.expires
                        ? new Date(sessionItem.content.cookie.expires)
                        : undefined;

                    db.insert(schema.sessions)
                        .values({
                            sid: sessionItem.sid,
                            content: sessionItem.content,
                            updatedAt,
                            expiresAt,
                        })
                        .onConflictDoNothing()
                        .run();
                    sessionsCount++;
                } catch {
                    // Ignore expired/invalid sessions
                }
            }
        }
        log.info(`Migrated ${sessionsCount} sessions from LokiJS`);
    }

    // Rename legacy file to avoid migrating again and keep backup
    renameLegacyFile(lokiFilePath);
}

function renameLegacyFile(filePath: string) {
    try {
        const backupPath = `${filePath}.migrated`;
        fs.renameSync(filePath, backupPath);
        log.info(`Legacy LokiJS file renamed to ${backupPath}`);
    } catch (e: any) {
        log.warn(`Could not rename legacy file (${filePath}): ${e.message}`);
    }
}
