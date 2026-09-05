// @ts-nocheck
import express from 'express';
import path from 'path';
import * as OpenApiValidator from 'express-openapi-validator';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { requireAuthentication } from './auth';

/**
 * Init the API router.
 * @returns {*|Router}
 */
export function init() {
    const router = express.Router();

    const specPath = path.join(__dirname, 'openapi.yaml');
    const swaggerDocument = YAML.load(specPath);

    // Provide the OpenAPI spec for Docusaurus or download
    router.get('/openapi.yaml', (req, res) => {
        res.sendFile(specPath);
    });

    // Swagger UI
    router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // WUD's original authentication middleware logic for protected routes.
    // In OpenAPI, /app (and docs) are public. We can conditionally require authentication
    // or just let it intercept API routes.
    // To match original behavior exactly: we authenticate everything EXCEPT /app and docs.
    router.use((req, res, next) => {
        if (
            req.path.startsWith('/app') ||
            req.path.startsWith('/docs') ||
            req.path === '/openapi.yaml'
        ) {
            return next();
        }
        return requireAuthentication(req, res, next);
    });

    // Mount express-openapi-validator
    router.use(
        OpenApiValidator.middleware({
            apiSpec: specPath,
            validateRequests: true,
            validateResponses: true,
            operationHandlers: path.join(__dirname),
        }),
    );

    // Default error handler for OpenAPI Validator
    router.use((err, req, res, next) => {
        res.status(err.status || 500).json({
            error: err.name || 'Error',
            message: err.message,
            errors: err.errors,
        });
    });

    // All other API routes => 404 (already handled by validator if not in spec, but fallback)
    router.use('/*', (req, res) => res.sendStatus(404));

    return router;
}
