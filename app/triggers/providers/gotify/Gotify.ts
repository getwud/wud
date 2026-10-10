import { GotifyClient } from 'gotify-client';
import Trigger, { RollbackReport } from '../Trigger';
import { Container } from '../../../model/container';

function isPlainObject(item: unknown): item is Record<string, unknown> {
    return (
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        Object.prototype.toString.call(item) === '[object Object]'
    );
}

export function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
        const targetValue = result[key];
        const sourceValue = source[key];
        if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = sourceValue;
        }
    }
    return result;
}

/**
 * Gotify Trigger implementation
 */
class Gotify extends Trigger {
    public client!: GotifyClient;

    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            url: this.joi.string().uri({
                scheme: ['http', 'https'],
            }),
            token: this.joi.string(),
            priority: this.joi.number().integer().min(0),
            extras: this.joi.alternatives([
                this.joi.object(),
                this.joi
                    .string()
                    .empty('')
                    .custom((value, helpers) => {
                        try {
                            const parsed = JSON.parse(value);
                            if (
                                typeof parsed !== 'object' ||
                                parsed === null ||
                                Array.isArray(parsed)
                            ) {
                                return helpers.error('any.invalid');
                            }
                            return parsed;
                        } catch {
                            return helpers.error('any.invalid');
                        }
                    }),
            ]),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            url: this.configuration.url,
            token: Gotify.mask(this.configuration.token as string),
        };
    }

    /**
     * Init trigger.
     */
    async initTrigger(): Promise<void> {
        this.client = new GotifyClient(this.configuration.url as string, {
            app: this.configuration.token as string,
        });
    }

    /**
     * Parse extras from unknown value (object or JSON string).
     */
    parseExtras(
        extras: unknown,
        sourceDescription?: string,
    ): Record<string, unknown> | undefined {
        if (!extras) {
            return undefined;
        }
        if (typeof extras === 'string') {
            const trimmed = extras.trim();
            if (!trimmed) {
                return undefined;
            }
            try {
                const parsed = JSON.parse(trimmed);
                if (isPlainObject(parsed)) {
                    return parsed;
                }
                this.log.warn(
                    `Gotify extras${sourceDescription ? ` (${sourceDescription})` : ''} must be a valid JSON object`,
                );
                return undefined;
            } catch (e: unknown) {
                const error = e as Error;
                this.log.warn(
                    `Failed to parse Gotify extras JSON${sourceDescription ? ` (${sourceDescription})` : ''} (${error.message})`,
                );
                return undefined;
            }
        }
        if (isPlainObject(extras)) {
            return extras;
        }
        this.log.warn(
            `Gotify extras${sourceDescription ? ` (${sourceDescription})` : ''} must be an object`,
        );
        return undefined;
    }

    /**
     * Resolve and merge extras for a container from configuration and container labels.
     */
    getExtras(container?: Container): Record<string, unknown> | undefined {
        let extras: Record<string, unknown> | undefined;

        // 1. Global trigger configuration extras
        const globalExtras = this.parseExtras(
            this.configuration.extras,
            'trigger configuration',
        );
        if (globalExtras) {
            extras = { ...globalExtras };
        }

        // 2. Container labels (generic and specific)
        if (container?.labels) {
            const genericLabel = container.labels['wud.trigger.gotify.extras'];
            const genericExtras = this.parseExtras(
                genericLabel,
                'container label wud.trigger.gotify.extras',
            );
            if (genericExtras) {
                extras = extras
                    ? deepMerge(extras, genericExtras)
                    : { ...genericExtras };
            }

            const specificLabel =
                container.labels[`wud.trigger.gotify.${this.name}.extras`];
            const specificExtras = this.parseExtras(
                specificLabel,
                `container label wud.trigger.gotify.${this.name}.extras`,
            );
            if (specificExtras) {
                extras = extras
                    ? deepMerge(extras, specificExtras)
                    : { ...specificExtras };
            }
        }

        return extras;
    }

    /**
     * Resolve and merge extras for a batch of containers.
     */
    getBatchExtras(
        containers?: Container[],
    ): Record<string, unknown> | undefined {
        let extras = this.parseExtras(
            this.configuration.extras,
            'trigger configuration',
        );
        if (containers && Array.isArray(containers)) {
            for (const container of containers) {
                if (container?.labels) {
                    const genericLabel =
                        container.labels['wud.trigger.gotify.extras'];
                    const genericExtras = this.parseExtras(
                        genericLabel,
                        'container label wud.trigger.gotify.extras',
                    );
                    if (genericExtras) {
                        extras = extras
                            ? deepMerge(extras, genericExtras)
                            : { ...genericExtras };
                    }

                    const specificLabel =
                        container.labels[
                            `wud.trigger.gotify.${this.name}.extras`
                        ];
                    const specificExtras = this.parseExtras(
                        specificLabel,
                        `container label wud.trigger.gotify.${this.name}.extras`,
                    );
                    if (specificExtras) {
                        extras = extras
                            ? deepMerge(extras, specificExtras)
                            : { ...specificExtras };
                    }
                }
            }
        }
        return extras;
    }

    /**
     * Send an HTTP Request to Gotify.
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container: Container): Promise<void> {
        const extras = this.getExtras(container);
        const payload: {
            title: string;
            message: string;
            priority?: number;
            extras?: Record<string, unknown>;
        } = {
            title: this.renderSimpleTitle(container),
            message: this.renderSimpleBody(container),
            priority: this.configuration.priority as number | undefined,
        };
        if (extras) {
            payload.extras = extras;
        }
        await this.client.message.createMessage(payload);
    }

    /**
     * Send an HTTP Request to Gotify for batch container updates.
     * @param containers
     * @returns {Promise<void>}
     */
    async triggerBatch(containers: Container[]): Promise<void> {
        const extras = this.getBatchExtras(containers);
        const payload: {
            title: string;
            message: string;
            priority?: number;
            extras?: Record<string, unknown>;
        } = {
            title: this.renderBatchTitle(containers),
            message: this.renderBatchBody(containers),
            priority: this.configuration.priority as number | undefined,
        };
        if (extras) {
            payload.extras = extras;
        }
        await this.client.message.createMessage(payload);
    }

    /**
     * This trigger supports rollback notifications.
     */
    supportsRollbackNotifications(): boolean {
        return true;
    }

    /**
     * Send a rollback notification to Gotify.
     * @param rollbackReport the rollback report
     * @returns {Promise<void>}
     */
    async triggerRollback(rollbackReport: RollbackReport): Promise<void> {
        const extras = this.getExtras(rollbackReport.container);
        const payload: {
            title: string;
            message: string;
            priority?: number;
            extras?: Record<string, unknown>;
        } = {
            title: this.renderRollbackTitle(rollbackReport),
            message: this.renderRollbackBody(rollbackReport),
            priority: this.configuration.priority as number | undefined,
        };
        if (extras) {
            payload.extras = extras;
        }
        await this.client.message.createMessage(payload);
    }
}

export default Gotify;
