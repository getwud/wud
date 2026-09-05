import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrations';
import logger from '../../log';

const log = logger.child({ component: 'store-db' });

let sqliteInstance: Database.Database | undefined;
let dbInstance: BetterSQLite3Database<typeof schema> | undefined;

export function initDatabase(dbFilePath: string) {
    log.info(`Initializing SQLite database at ${dbFilePath}`);
    sqliteInstance = new Database(dbFilePath);

    // Optimize performance and enforce integrity
    sqliteInstance.pragma('journal_mode = WAL');
    sqliteInstance.pragma('foreign_keys = ON');

    // Run pending DDL schema migrations
    runMigrations(sqliteInstance);

    dbInstance = drizzle(sqliteInstance, { schema });
    return { sqlite: sqliteInstance, db: dbInstance };
}

export function getDb(): BetterSQLite3Database<typeof schema> {
    if (!dbInstance) {
        throw new Error(
            'Database is not initialized. Call initDatabase first.',
        );
    }
    return dbInstance;
}

export function getSqlite(): Database.Database {
    if (!sqliteInstance) {
        throw new Error('SQLite is not initialized. Call initDatabase first.');
    }
    return sqliteInstance;
}

export function closeDatabase() {
    if (sqliteInstance) {
        log.info('Closing SQLite database connection');
        sqliteInstance.close();
        sqliteInstance = undefined;
        dbInstance = undefined;
    }
}
