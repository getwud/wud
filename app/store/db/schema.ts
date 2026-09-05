import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// App metadata table
export const appInfo = sqliteTable('app_info', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().default('wud'),
    version: text('version').notNull(),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// WUD Configurations (UI & feature configurations)
export const wudConfigurations = sqliteTable('wud_configurations', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    name: text('name').notNull(),
    config: text('config', { mode: 'json' }).notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// Containers table
export const containers = sqliteTable('containers', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    displayName: text('display_name').notNull(),
    displayIcon: text('display_icon').notNull().default('mdi:docker'),
    status: text('status').notNull().default('unknown'),
    watcher: text('watcher').notNull(),
    includeTags: text('include_tags'),
    excludeTags: text('exclude_tags'),
    transformTags: text('transform_tags'),
    linkTemplate: text('link_template'),
    link: text('link'),
    triggerInclude: text('trigger_include'),
    triggerExclude: text('trigger_exclude'),
    labels: text('labels', { mode: 'json' }),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// Container images table (One-to-One with container)
export const containerImages = sqliteTable('container_images', {
    containerId: text('container_id')
        .primaryKey()
        .references(() => containers.id, { onDelete: 'cascade' }),
    imageId: text('image_id').notNull(),
    registryName: text('registry_name').notNull(),
    registryUrl: text('registry_url').notNull(),
    name: text('name').notNull(),
    tagValue: text('tag_value').notNull(),
    tagSemver: integer('tag_semver', { mode: 'boolean' })
        .notNull()
        .default(false),
    digestWatch: integer('digest_watch', { mode: 'boolean' })
        .notNull()
        .default(false),
    digestValue: text('digest_value'),
    digestRepo: text('digest_repo'),
    architecture: text('architecture').notNull(),
    os: text('os').notNull(),
    variant: text('variant'),
    created: text('created'),
});

// Container results history table (One-to-Many with container)
export const containerResultsHistory = sqliteTable(
    'container_results_history',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        containerId: text('container_id')
            .notNull()
            .references(() => containers.id, { onDelete: 'cascade' }),
        tag: text('tag'),
        digest: text('digest'),
        created: text('created'),
        link: text('link'),
        updateAvailable: integer('update_available', { mode: 'boolean' })
            .notNull()
            .default(false),
        updateKind: text('update_kind'), // 'tag' | 'digest' | 'unknown'
        localValue: text('local_value'),
        remoteValue: text('remote_value'),
        semverDiff: text('semver_diff'),
        errorMessage: text('error_message'),
        checkedAt: text('checked_at').default(sql`(CURRENT_TIMESTAMP)`),
    },
    (table) => [
        index('idx_results_history_container').on(table.containerId),
        index('idx_results_history_checked_at').on(table.checkedAt),
    ],
);

// Sessions table (for express-session store)
export const sessions = sqliteTable('sessions', {
    sid: text('sid').primaryKey(),
    content: text('content', { mode: 'json' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
});
