import joi from 'joi';
import fs from 'fs';
import path from 'path';
import logger from '../log';
import { Logger } from 'pino';
import { getStoreConfiguration } from '../configuration';
import { initDatabase, getDb, getSqlite, closeDatabase } from './db';
import { migrateLokiToSqlite } from './migrate_loki';
import * as app from './app';
import * as container from './container';

class Store {
    private readonly configuration: {
        path: string;
        file: string;
    };

    private log: Logger;

    constructor() {
        this.log = logger.child({ component: 'store' });

        // Store Configuration Schema
        const configurationSchema = joi
            .object<{
                path: string;
                file: string;
            }>()
            .keys({
                path: joi.string().default('/store'),
                file: joi.string().default('wud.sqlite'),
            });

        // Validate Configuration
        const configurationToValidate = configurationSchema.validate(
            getStoreConfiguration() || {},
        );
        if (configurationToValidate.error) {
            throw configurationToValidate.error;
        }

        let validatedConfig = configurationToValidate.value;
        // If file was explicitly set to legacy wud.json, migrate target to wud.sqlite
        if (validatedConfig.file.endsWith('.json')) {
            this.log.warn(
                `Configured store file (${validatedConfig.file}) ends with .json. Using wud.sqlite for SQL database.`,
            );
            validatedConfig = {
                ...validatedConfig,
                file: 'wud.sqlite',
            };
        }
        this.configuration = validatedConfig;
    }

    createCollections() {
        app.createCollections();
        container.createCollections();
    }

    /**
     * Init DB.
     */
    public async init() {
        this.log.info(
            `Load store from (${this.configuration.path}/${this.configuration.file})`,
        );
        if (!fs.existsSync(this.configuration.path)) {
            this.log.info(`Create folder ${this.configuration.path}`);
            fs.mkdirSync(this.configuration.path, { recursive: true });
        }

        const dbFilePath = path.join(
            this.configuration.path,
            this.configuration.file,
        );

        // 1. Initialize SQLite connection and apply DDL migrations
        const { db } = initDatabase(dbFilePath);

        // 2. Automatic migration from legacy LokiJS file if present
        const legacyLokiPath = path.join(this.configuration.path, 'wud.json');
        if (fs.existsSync(legacyLokiPath)) {
            try {
                migrateLokiToSqlite(legacyLokiPath, db);
            } catch (e: any) {
                this.log.error(
                    `Failed migrating legacy LokiJS database: ${e.message}`,
                );
            }
        }

        // 3. Initialize app collections / records
        this.createCollections();
    }

    /**
     * Get configuration.
     */
    public getConfiguration() {
        return this.configuration;
    }

    public getDb() {
        return getDb();
    }

    public getSqlite() {
        return getSqlite();
    }

    public dispose() {
        this.log.info('Disposing db store');
        closeDatabase();
    }
}

export const store = new Store();
