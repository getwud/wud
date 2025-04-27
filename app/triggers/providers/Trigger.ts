import { BaseConfig, Component } from '../../registry/Component';
import * as event from '../../event';
import { getTriggerCounter } from '../../prometheus/trigger';
import { Container, fullName } from '../../model/container';
import { ObjectSchema } from 'joi';

/**
 * Render body or title simple template.
 * @param template
 * @param container
 * @returns {*}
 */
function renderSimple(template: string, container: Container): string {
    // Set deprecated vars for backward compatibility
    const id = container.id;
    const name = container.name;
    const watcher = container.watcher;
    const kind =
        container.updateKind && container.updateKind.kind
            ? container.updateKind.kind
            : '';
    const semver =
        container.updateKind && container.updateKind.semverDiff
            ? container.updateKind.semverDiff
            : '';
    const local =
        container.updateKind && container.updateKind.localValue
            ? container.updateKind.localValue
            : '';
    const remote =
        container.updateKind && container.updateKind.remoteValue
            ? container.updateKind.remoteValue
            : '';
    const link =
        container.result && container.result.link ? container.result.link : '';
    return eval('`' + template + '`');
}

function renderBatch(template: string, containers: Container[]) {
    // Set deprecated vars for backward compatibility
    const count = containers ? containers.length : 0;
    return eval('`' + template + '`');
}

export interface TriggerConfiguration extends BaseConfig {
    auto: boolean;
    threshold: 'all' | 'major' | 'minor' | 'patch';
    mode: 'simple' | 'batch';
    once: boolean;
    simpletitle: string;
    simplebody: string;
    batchtitle: string;
}

/**
 * Trigger base component.
 */
export class Trigger<T extends TriggerConfiguration = TriggerConfiguration> extends Component<T> {
    /**
     * Return true if update reaches trigger threshold.
     * @param containerResult
     * @param threshold
     */
    static isThresholdReached(containerResult: Container, threshold: string) {
        let thresholdPassing = true;
        if (
            threshold.toLowerCase() !== 'all' &&
            containerResult.updateKind &&
            containerResult.updateKind.kind === 'tag' &&
            containerResult.updateKind.semverDiff &&
            containerResult.updateKind.semverDiff !== 'unknown'
        ) {
            switch (threshold) {
                case 'minor':
                    thresholdPassing =
                        containerResult.updateKind.semverDiff !== 'major';
                    break;
                case 'patch':
                    thresholdPassing =
                        containerResult.updateKind.semverDiff !== 'major' &&
                        containerResult.updateKind.semverDiff !== 'minor';
                    break;
                default:
                    thresholdPassing = true;
            }
        }
        return thresholdPassing;
    }

    /**
     * Parse $name:$threshold string.
     * @param {*} includeOrExcludeTriggerString
     */
    static parseIncludeOrIncludeTriggerString(includeOrExcludeTriggerString: string) {
        const includeOrExcludeTriggerSplit =
            includeOrExcludeTriggerString.split(/\s*:\s*/);
        const includeOrExcludeTrigger: {
            id: string;
            threshold: 'all' | 'major' | 'minor' | 'patch';
        } = {
            id: includeOrExcludeTriggerSplit[0],
            threshold: 'all',
        };
        if (includeOrExcludeTriggerSplit.length === 2) {
            switch (includeOrExcludeTriggerSplit[1]) {
                case 'major':
                    includeOrExcludeTrigger.threshold = 'major';
                    break;
                case 'minor':
                    includeOrExcludeTrigger.threshold = 'minor';
                    break;
                case 'patch':
                    includeOrExcludeTrigger.threshold = 'patch';
                    break;
                default:
                    includeOrExcludeTrigger.threshold = 'all';
            }
        }
        return includeOrExcludeTrigger;
    }

    /**
     * Handle container report (simple mode).
     * @param containerReport
     */
    async handleContainerReport(containerReport: event.ContainerReport) {
        // Filter on changed containers with update available and passing trigger threshold
        if (
            (containerReport.changed || !this.configuration.once) &&
            containerReport.container.updateAvailable
        ) {
            const logContainer =
                this.log.child({
                    container: fullName(containerReport.container),
                }) || this.log;
            let status = 'error';
            try {
                if (
                    !Trigger.isThresholdReached(
                        containerReport.container,
                        this.configuration.threshold.toLowerCase(),
                    )
                ) {
                    logContainer.debug('Threshold not reached => ignore');
                } else if (!this.mustTrigger(containerReport.container)) {
                    logContainer.debug('Trigger conditions not met => ignore');
                } else {
                    logContainer.debug('Run');
                    await this.trigger(containerReport.container);
                }
                status = 'success';
            } catch (e: any) {
                logContainer.warn(`Error (${e.message})`);
                logContainer.debug(e);
            } finally {
                getTriggerCounter().inc({
                    type: this.type,
                    name: this.name,
                    status,
                });
            }
        }
    }

    /**
     * Handle container reports (batch mode).
     * @param containerReports
     */
    async handleContainerReports(containerReports: event.ContainerReport[]) {
        // Filter on containers with update available and passing trigger threshold
        try {
            const containerReportsFiltered = containerReports
                .filter(
                    (containerReport) =>
                        containerReport.changed || !this.configuration.once,
                )
                .filter(
                    (containerReport) =>
                        containerReport.container.updateAvailable,
                )
                .filter((containerReport) =>
                    this.mustTrigger(containerReport.container),
                )
                .filter((containerReport) =>
                    Trigger.isThresholdReached(
                        containerReport.container,
                        this.configuration.threshold.toLowerCase(),
                    ),
                );
            const containersFiltered = containerReportsFiltered.map(
                (containerReport) => containerReport.container,
            );
            if (containersFiltered.length > 0) {
                this.log.debug('Run batch');
                await this.triggerBatch(containersFiltered);
            }
        } catch (e: any) {
            this.log.warn(`Error (${e.message})`);
            this.log.debug(e);
        }
    }

    isTriggerIncludedOrExcluded(containerResult: Container, trigger: string) {
        const triggers = trigger
            .split(/\s*,\s*/)
            .map((triggerToMatch) =>
                Trigger.parseIncludeOrIncludeTriggerString(triggerToMatch),
            );
        const triggerMatched = triggers.find(
            (triggerToMatch) =>
                triggerToMatch.id.toLowerCase() === this.getId(),
        );
        if (!triggerMatched) {
            return false;
        }
        return Trigger.isThresholdReached(
            containerResult,
            triggerMatched.threshold.toLowerCase(),
        );
    }

    isTriggerIncluded(containerResult: Container, triggerInclude: string | undefined) {
        if (!triggerInclude) {
            return true;
        }
        return this.isTriggerIncludedOrExcluded(
            containerResult,
            triggerInclude,
        );
    }

    isTriggerExcluded(containerResult: Container, triggerExclude: string | undefined) {
        if (!triggerExclude) {
            return false;
        }
        return this.isTriggerIncludedOrExcluded(
            containerResult,
            triggerExclude,
        );
    }

    /**
     * Return true if must trigger on this container.
     * @param containerResult
     */
    mustTrigger(containerResult: Container) {
        const { triggerInclude, triggerExclude } = containerResult;
        return (
            this.isTriggerIncluded(containerResult, triggerInclude) &&
            !this.isTriggerExcluded(containerResult, triggerExclude)
        );
    }

    /**
     * Init the Trigger.
     */
    async init() {
        await this.initTrigger();
        if (this.configuration.auto) {
            this.log.info(`Registering for auto execution`);
            if (this.configuration.mode.toLowerCase() === 'simple') {
                event.registerContainerReport(async (containerReport) =>
                    this.handleContainerReport(containerReport),
                );
            }
            if (this.configuration.mode.toLowerCase() === 'batch') {
                event.registerContainerReports(async (containersReports) =>
                    this.handleContainerReports(containersReports),
                );
            }
        } else {
            this.log.info(`Registering for manual execution`);
        }
    }

    /**
     * Override method to merge with common Trigger options (threshold...).
     * @param configuration
     */
    validateConfiguration<TC extends T>(configuration: TC): TC {
        const schema = this.getConfigurationSchema();
        const schemaWithDefaultOptions = (schema as ObjectSchema).append({
            auto: this.joi.bool().default(true),
            threshold: this.joi
                .string()
                .insensitive()
                .valid('all', 'major', 'minor', 'patch')
                .default('all'),
            mode: this.joi
                .string()
                .insensitive()
                .valid('simple', 'batch')
                .default('simple'),
            once: this.joi.boolean().default(true),
            simpletitle: this.joi
                .string()
                .default(
                    'New ${container.updateKind.kind} found for container ${container.name}',
                ),
            simplebody: this.joi
                .string()
                .default(
                    'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
                ),
            batchtitle: this.joi
                .string()
                .default('${containers.length} updates available'),
        });
        const schemaValidated =
            schemaWithDefaultOptions.validate(configuration);
        if (schemaValidated.error) {
            throw schemaValidated.error;
        }
        return (schemaValidated.value ? schemaValidated.value : {}) as TC;
    }

    /**
     * Init Trigger. Can be overridden in trigger implementation class.
     */

    async initTrigger() {
        // do nothing by default
    }

    /**
     * Trigger method. Must be overridden in trigger implementation class.
     */
    async trigger(_containerWithResult: Container): Promise<void | any> {
        // do nothing by default
        this.log.warn(
            'Cannot trigger container result; this trigger doe not implement "simple" mode',
        );
    }

    /**
     * Trigger batch method. Must be overridden in trigger implementation class.
     * @param containersWithResult
     */
    async triggerBatch(_containersWithResult: Container[]): Promise<void | any> {
        // do nothing by default
        this.log.warn(
            'Cannot trigger container results; this trigger doe not implement "batch" mode',
        );
    }

    /**
     * Render trigger title simple.
     * @param container
     */
    renderSimpleTitle(container: Container) {
        return renderSimple(this.configuration.simpletitle, container);
    }

    /**
     * Render trigger body simple.
     * @param container
     */
    renderSimpleBody(container: Container) {
        return renderSimple(this.configuration.simplebody, container);
    }

    /**
     * Render trigger title batch.
     * @param containers
     */
    renderBatchTitle(containers: Container[]) {
        return renderBatch(this.configuration.batchtitle, containers);
    }

    /**
     * Render trigger body batch.
     * @param containers
     */
    renderBatchBody(containers: Container[]) {
        return containers
            .map((container) => `- ${this.renderSimpleBody(container)}\n`)
            .join('\n');
    }
}
