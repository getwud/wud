import joi from 'joi';
import Loki from 'lokijs';
import fs from 'fs';
import logger from '../log';
import bunyan from 'bunyan';
import { getStoreConfiguration } from '../configuration';

import * as app from './app';
import * as container from './container';

class Store {
    private db: Loki;

    private readonly configuration: {
        path: string;
        file: string;
    };

    private log: bunyan;
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
                file: joi.string().default('wud.json'),
            });

        // Validate Configuration
        const configurationToValidate = configurationSchema.validate(
            getStoreConfiguration() || {},
        );
        if (configurationToValidate.error) {
            throw configurationToValidate.error;
        }
        this.configuration = configurationToValidate.value;

        // Loki DB
        this.db = new Loki(
            `${this.configuration.path}/${this.configuration.file}`,
            {
                autosave: true,
                serializationMethod: 'pretty',
            },
        );
    }

    createCollections() {
        app.createCollections(this.db);
        container.createCollections(this.db);
    }
    /**
     * Load DB.
     */
    async loadDb(
        err: any,
        resolve: (value: void) => void,
        reject: (reason?: any) => void,
    ) {
        if (err) {
            reject(err);
        } else {
            // Create collections
            this.createCollections();
            resolve();
        }
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
            fs.mkdirSync(this.configuration.path);
        }

        return new Promise<void>((resolve, reject) => {
            this.db.loadDatabase({}, (err) =>
                this.loadDb(err, resolve, reject),
            );
        });
    }

    /**
     * Get configuration.
     */
    public getConfiguration() {
        return this.configuration;
    }

    public getDb() {
        return this.db;
    }

    public dispose() {
        this.log.info('Disposing db store');
        this.db.close();
    }
}

export const store = new Store();
