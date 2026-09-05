import Database from 'better-sqlite3';
import logger from '../../log';

const log = logger.child({ component: 'store-migrations' });

export interface Migration {
    id: number;
    name: string;
    sql: string[];
}

export const migrations: Migration[] = [
    {
        id: 0,
        name: '0000_initial',
        sql: [
            `CREATE TABLE IF NOT EXISTS app_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                name TEXT DEFAULT 'wud' NOT NULL,
                version TEXT NOT NULL,
                updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
            );`,
            `CREATE TABLE IF NOT EXISTS containers (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                display_icon TEXT DEFAULT 'mdi:docker' NOT NULL,
                status TEXT DEFAULT 'unknown' NOT NULL,
                watcher TEXT NOT NULL,
                include_tags TEXT,
                exclude_tags TEXT,
                transform_tags TEXT,
                link_template TEXT,
                link TEXT,
                trigger_include TEXT,
                trigger_exclude TEXT,
                labels TEXT,
                created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
                updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
            );`,
            `CREATE TABLE IF NOT EXISTS container_images (
                container_id TEXT PRIMARY KEY NOT NULL,
                image_id TEXT NOT NULL,
                registry_name TEXT NOT NULL,
                registry_url TEXT NOT NULL,
                name TEXT NOT NULL,
                tag_value TEXT NOT NULL,
                tag_semver INTEGER DEFAULT 0 NOT NULL,
                digest_watch INTEGER DEFAULT 0 NOT NULL,
                digest_value TEXT,
                digest_repo TEXT,
                architecture TEXT NOT NULL,
                os TEXT NOT NULL,
                variant TEXT,
                created TEXT,
                FOREIGN KEY (container_id) REFERENCES containers(id) ON UPDATE NO ACTION ON DELETE CASCADE
            );`,
            `CREATE TABLE IF NOT EXISTS container_results_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                container_id TEXT NOT NULL,
                tag TEXT,
                digest TEXT,
                created TEXT,
                link TEXT,
                update_available INTEGER DEFAULT 0 NOT NULL,
                update_kind TEXT,
                local_value TEXT,
                remote_value TEXT,
                semver_diff TEXT,
                error_message TEXT,
                checked_at TEXT DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (container_id) REFERENCES containers(id) ON UPDATE NO ACTION ON DELETE CASCADE
            );`,
            `CREATE INDEX IF NOT EXISTS idx_results_history_container ON container_results_history (container_id);`,
            `CREATE INDEX IF NOT EXISTS idx_results_history_checked_at ON container_results_history (checked_at);`,
            `CREATE TABLE IF NOT EXISTS sessions (
                sid TEXT PRIMARY KEY NOT NULL,
                content TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                expires_at INTEGER
            );`,
            `CREATE TABLE IF NOT EXISTS wud_configurations (
                id TEXT PRIMARY KEY NOT NULL,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                config TEXT NOT NULL,
                enabled INTEGER DEFAULT 1 NOT NULL,
                created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
                updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
            );`,
        ],
    },
];

export function runMigrations(sqlite: Database.Database) {
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS __wud_migrations (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            applied_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        );
    `);

    const appliedRows = sqlite
        .prepare('SELECT id FROM __wud_migrations')
        .all() as { id: number }[];
    const appliedIds = new Set(appliedRows.map((row) => row.id));

    for (const migration of migrations) {
        if (!appliedIds.has(migration.id)) {
            log.info(
                `Applying DDL migration ${migration.id} (${migration.name})`,
            );
            sqlite.transaction(() => {
                for (const query of migration.sql) {
                    sqlite.exec(query);
                }
                sqlite
                    .prepare(
                        'INSERT INTO __wud_migrations (id, name) VALUES (?, ?)',
                    )
                    .run(migration.id, migration.name);
            })();
        }
    }
}
