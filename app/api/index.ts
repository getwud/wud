import fs from 'fs';
import https from 'https';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import logger from '../log';
const log = logger.child({ component: 'api' });
import * as auth from './auth';
import * as apiRouter from './api';
import * as uiRouter from './ui';
import * as prometheusRouter from './prometheus';
import * as healthRouter from './health';
import { getServerConfiguration } from '../configuration';

const configuration = getServerConfiguration();

/**
 * Init Http API.
 * @returns {Promise<void>}
 */
export async function init() {
    // Start API if enabled
    if (configuration.enabled) {
        log.debug(
            `API/UI enabled => Start Http listener on port ${configuration.port}`,
        );

        // Init Express app
        const app = express();

        // Trust proxy (helpful to resolve public facing hostname & protocol)
        app.set('trust proxy', true);

        // Replace undefined values by null to prevent them from being removed from json responses
        app.set('json replacer', (_key: string, value: any) =>
            value === undefined ? null : value,
        );

        if (configuration.cors.enabled) {
            log.warn(
                `CORS is enabled, please make sure that the provided configuration is not a security breech (${JSON.stringify(configuration.cors)})`,
            );
            app.use(
                cors({
                    origin: configuration.cors.origin,
                    methods: configuration.cors.methods,
                }),
            );
        }

        // Init auth
        auth.init(app);

        // Parse json payloads
        app.use(bodyParser.json());

        // Mount Healthcheck
        app.use('/health', healthRouter.init());

        // Mount API
        app.use('/api', apiRouter.init());

        // Mount Prometheus metrics
        app.use('/metrics', prometheusRouter.init());

        // Serve ui (resulting from ui built & copied on docker build)
        app.use('/', uiRouter.init());

        if (configuration.tls.enabled) {
            let serverKey;
            let serverCert;
            try {
                serverKey = fs.readFileSync(configuration.tls.key!);
            } catch (e: any) {
                log.error(
                    `Unable to read the key file under ${configuration.tls.key} (${e.message})`,
                );
                throw e;
            }
            try {
                serverCert = fs.readFileSync(configuration.tls.cert!);
            } catch (e: any) {
                log.error(
                    `Unable to read the cert file under ${configuration.tls.cert} (${e.message})`,
                );
                throw e;
            }
            https
                .createServer({ key: serverKey, cert: serverCert }, app)
                .listen(configuration.port, () => {
                    log.info(
                        `Server listening on port ${configuration.port} (HTTPS)`,
                    );
                });
        } else {
            // Listen plain HTTP
            app.listen(configuration.port, () => {
                log.info(
                    `Server listening on port ${configuration.port} (HTTP)`,
                );
            });
        }
    } else {
        log.debug('API/UI disabled');
    }
}

