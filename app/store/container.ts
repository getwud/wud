import { byString, byValues } from 'sort-es';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from '../log';
import * as schema from './db/schema';
import { getDb } from './db';
import { Container, validate as validateContainer } from '../model/container';
import {
    emitContainerAdded,
    emitContainerUpdated,
    emitContainerRemoved,
} from '../event';

const log = logger.child({ component: 'store-container' });

/**
 * No-op for backwards compatibility with Loki store setup.
 */
export function createCollections() {
    log.debug('Using SQLite store: tables managed via DDL migrations');
}

function buildContainerFromRows(
    containerRow: typeof schema.containers.$inferSelect,
    imageRow?: typeof schema.containerImages.$inferSelect,
    historyRow?: typeof schema.containerResultsHistory.$inferSelect,
): Container {
    const raw: any = {
        id: containerRow.id,
        name: containerRow.name,
        displayName: containerRow.displayName,
        displayIcon: containerRow.displayIcon,
        status: containerRow.status,
        watcher: containerRow.watcher,
        includeTags: containerRow.includeTags ?? undefined,
        excludeTags: containerRow.excludeTags ?? undefined,
        transformTags: containerRow.transformTags ?? undefined,
        linkTemplate: containerRow.linkTemplate ?? undefined,
        link: containerRow.link ?? undefined,
        triggerInclude: containerRow.triggerInclude ?? undefined,
        triggerExclude: containerRow.triggerExclude ?? undefined,
        labels: containerRow.labels ?? undefined,
    };

    if (imageRow) {
        raw.image = {
            id: imageRow.imageId,
            registry: {
                name: imageRow.registryName,
                url: imageRow.registryUrl,
            },
            name: imageRow.name,
            tag: {
                value: imageRow.tagValue,
                semver: Boolean(imageRow.tagSemver),
            },
            digest: {
                watch: Boolean(imageRow.digestWatch),
                value: imageRow.digestValue ?? undefined,
                repo: imageRow.digestRepo ?? undefined,
            },
            architecture: imageRow.architecture,
            os: imageRow.os,
            variant: imageRow.variant ?? undefined,
            created: imageRow.created ?? undefined,
        };
    }

    if (historyRow) {
        if (historyRow.tag || historyRow.digest) {
            raw.result = {
                tag: historyRow.tag ?? undefined,
                digest: historyRow.digest ?? undefined,
                created: historyRow.created ?? undefined,
                link: historyRow.link ?? undefined,
            };
        }
        if (historyRow.errorMessage) {
            raw.error = {
                message: historyRow.errorMessage,
            };
        }
    }

    return validateContainer(raw);
}

/**
 * Insert new Container.
 */
export function insertContainer(container: any): Container {
    const containerToSave = validateContainer(container);
    const db = getDb();

    // 1. Insert container
    db.insert(schema.containers)
        .values({
            id: containerToSave.id,
            name: containerToSave.name,
            displayName: containerToSave.displayName,
            displayIcon: containerToSave.displayIcon,
            status: containerToSave.status,
            watcher: containerToSave.watcher,
            includeTags: containerToSave.includeTags,
            excludeTags: containerToSave.excludeTags,
            transformTags: containerToSave.transformTags,
            linkTemplate: containerToSave.linkTemplate,
            link: containerToSave.link,
            triggerInclude: containerToSave.triggerInclude,
            triggerExclude: containerToSave.triggerExclude,
            labels: containerToSave.labels,
        })
        .run();

    // 2. Insert image
    if (containerToSave.image) {
        db.insert(schema.containerImages)
            .values({
                containerId: containerToSave.id,
                imageId: containerToSave.image.id,
                registryName: containerToSave.image.registry.name,
                registryUrl: containerToSave.image.registry.url,
                name: containerToSave.image.name,
                tagValue: containerToSave.image.tag.value,
                tagSemver: containerToSave.image.tag.semver,
                digestWatch: containerToSave.image.digest.watch,
                digestValue: containerToSave.image.digest.value,
                digestRepo: containerToSave.image.digest.repo,
                architecture: containerToSave.image.architecture,
                os: containerToSave.image.os,
                variant: containerToSave.image.variant,
                created: containerToSave.image.created,
            })
            .run();
    }

    // 3. Insert initial history
    if (containerToSave.result || containerToSave.error) {
        db.insert(schema.containerResultsHistory)
            .values({
                containerId: containerToSave.id,
                tag: containerToSave.result?.tag,
                digest: containerToSave.result?.digest,
                created: containerToSave.result?.created,
                link: containerToSave.result?.link,
                updateAvailable: containerToSave.updateAvailable,
                updateKind: containerToSave.updateKind?.kind,
                localValue: containerToSave.updateKind?.localValue,
                remoteValue: containerToSave.updateKind?.remoteValue,
                semverDiff: containerToSave.updateKind?.semverDiff,
                errorMessage: containerToSave.error?.message,
            })
            .run();
    }

    emitContainerAdded(containerToSave);
    return containerToSave;
}

/**
 * Update existing container.
 */
export function updateContainer(container: any): Container {
    const containerToReturn = validateContainer(container);
    const db = getDb();

    // 1. Update or upsert container record
    db.insert(schema.containers)
        .values({
            id: containerToReturn.id,
            name: containerToReturn.name,
            displayName: containerToReturn.displayName,
            displayIcon: containerToReturn.displayIcon,
            status: containerToReturn.status,
            watcher: containerToReturn.watcher,
            includeTags: containerToReturn.includeTags,
            excludeTags: containerToReturn.excludeTags,
            transformTags: containerToReturn.transformTags,
            linkTemplate: containerToReturn.linkTemplate,
            link: containerToReturn.link,
            triggerInclude: containerToReturn.triggerInclude,
            triggerExclude: containerToReturn.triggerExclude,
            labels: containerToReturn.labels,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .onConflictDoUpdate({
            target: schema.containers.id,
            set: {
                name: containerToReturn.name,
                displayName: containerToReturn.displayName,
                displayIcon: containerToReturn.displayIcon,
                status: containerToReturn.status,
                watcher: containerToReturn.watcher,
                includeTags: containerToReturn.includeTags,
                excludeTags: containerToReturn.excludeTags,
                transformTags: containerToReturn.transformTags,
                linkTemplate: containerToReturn.linkTemplate,
                link: containerToReturn.link,
                triggerInclude: containerToReturn.triggerInclude,
                triggerExclude: containerToReturn.triggerExclude,
                labels: containerToReturn.labels,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            },
        })
        .run();

    // 2. Update image
    if (containerToReturn.image) {
        db.insert(schema.containerImages)
            .values({
                containerId: containerToReturn.id,
                imageId: containerToReturn.image.id,
                registryName: containerToReturn.image.registry.name,
                registryUrl: containerToReturn.image.registry.url,
                name: containerToReturn.image.name,
                tagValue: containerToReturn.image.tag.value,
                tagSemver: containerToReturn.image.tag.semver,
                digestWatch: containerToReturn.image.digest.watch,
                digestValue: containerToReturn.image.digest.value,
                digestRepo: containerToReturn.image.digest.repo,
                architecture: containerToReturn.image.architecture,
                os: containerToReturn.image.os,
                variant: containerToReturn.image.variant,
                created: containerToReturn.image.created,
            })
            .onConflictDoUpdate({
                target: schema.containerImages.containerId,
                set: {
                    imageId: containerToReturn.image.id,
                    registryName: containerToReturn.image.registry.name,
                    registryUrl: containerToReturn.image.registry.url,
                    name: containerToReturn.image.name,
                    tagValue: containerToReturn.image.tag.value,
                    tagSemver: containerToReturn.image.tag.semver,
                    digestWatch: containerToReturn.image.digest.watch,
                    digestValue: containerToReturn.image.digest.value,
                    digestRepo: containerToReturn.image.digest.repo,
                    architecture: containerToReturn.image.architecture,
                    os: containerToReturn.image.os,
                    variant: containerToReturn.image.variant,
                    created: containerToReturn.image.created,
                },
            })
            .run();
    }

    // 3. Update history: append if changed or if first result, otherwise touch timestamp
    if (containerToReturn.result || containerToReturn.error) {
        const latestHistory = db
            .select()
            .from(schema.containerResultsHistory)
            .where(
                eq(
                    schema.containerResultsHistory.containerId,
                    containerToReturn.id,
                ),
            )
            .orderBy(desc(schema.containerResultsHistory.id))
            .limit(1)
            .get();

        const isSameAsLatest =
            latestHistory &&
            latestHistory.tag === (containerToReturn.result?.tag ?? null) &&
            latestHistory.digest ===
                (containerToReturn.result?.digest ?? null) &&
            latestHistory.errorMessage ===
                (containerToReturn.error?.message ?? null);

        if (isSameAsLatest) {
            // Simply update checked_at on the existing record
            db.update(schema.containerResultsHistory)
                .set({ checkedAt: sql`CURRENT_TIMESTAMP` })
                .where(eq(schema.containerResultsHistory.id, latestHistory.id))
                .run();
        } else {
            // Result or error changed: append new history entry
            db.insert(schema.containerResultsHistory)
                .values({
                    containerId: containerToReturn.id,
                    tag: containerToReturn.result?.tag,
                    digest: containerToReturn.result?.digest,
                    created: containerToReturn.result?.created,
                    link: containerToReturn.result?.link,
                    updateAvailable: containerToReturn.updateAvailable,
                    updateKind: containerToReturn.updateKind?.kind,
                    localValue: containerToReturn.updateKind?.localValue,
                    remoteValue: containerToReturn.updateKind?.remoteValue,
                    semverDiff: containerToReturn.updateKind?.semverDiff,
                    errorMessage: containerToReturn.error?.message,
                })
                .run();
        }
    }

    emitContainerUpdated(containerToReturn);
    return containerToReturn;
}

/**
 * Get container by id.
 */
export function getContainer(id: string): Container | undefined {
    let db;
    try {
        db = getDb();
    } catch {
        return undefined;
    }

    const containerRow = db
        .select()
        .from(schema.containers)
        .where(eq(schema.containers.id, id))
        .get();

    if (!containerRow) {
        return undefined;
    }

    const imageRow = db
        .select()
        .from(schema.containerImages)
        .where(eq(schema.containerImages.containerId, id))
        .get();

    const historyRow = db
        .select()
        .from(schema.containerResultsHistory)
        .where(eq(schema.containerResultsHistory.containerId, id))
        .orderBy(desc(schema.containerResultsHistory.id))
        .limit(1)
        .get();

    return buildContainerFromRows(containerRow, imageRow, historyRow);
}

/**
 * Get all (filtered) containers.
 */
export function getContainers(query: Record<string, any> = {}): Container[] {
    let db;
    try {
        db = getDb();
    } catch {
        return [];
    }

    let containerRows = db.select().from(schema.containers).all();

    // In-memory filter for any query attributes
    if (query && Object.keys(query).length > 0) {
        containerRows = containerRows.filter((row) => {
            return Object.entries(query).every(
                ([k, v]) => (row as any)[k] === v,
            );
        });
    }

    const containerList = containerRows.map((containerRow) => {
        const imageRow = db
            .select()
            .from(schema.containerImages)
            .where(eq(schema.containerImages.containerId, containerRow.id))
            .get();

        const historyRow = db
            .select()
            .from(schema.containerResultsHistory)
            .where(
                eq(schema.containerResultsHistory.containerId, containerRow.id),
            )
            .orderBy(desc(schema.containerResultsHistory.id))
            .limit(1)
            .get();

        return buildContainerFromRows(containerRow, imageRow, historyRow);
    });

    return containerList.sort(
        byValues([
            [(container: Container) => container.watcher, byString()],
            [(container: Container) => container.name, byString()],
            [
                (container: Container) => container.image?.tag?.value ?? '',
                byString(),
            ],
        ]),
    );
}

/**
 * Delete container by id.
 */
export function deleteContainer(id: string) {
    let db;
    try {
        db = getDb();
    } catch {
        return;
    }

    const container = getContainer(id);
    if (container) {
        db.delete(schema.containers).where(eq(schema.containers.id, id)).run();
        emitContainerRemoved(container);
    }
}

/**
 * Get container results history.
 */
export function getContainerHistory(containerId: string) {
    let db;
    try {
        db = getDb();
    } catch {
        return [];
    }

    return db
        .select()
        .from(schema.containerResultsHistory)
        .where(eq(schema.containerResultsHistory.containerId, containerId))
        .orderBy(desc(schema.containerResultsHistory.id))
        .all();
}
