import Component, { ComponentConfiguration } from '../../registry/Component';
import * as event from '../../event';
import { getTriggerCounter } from '../../prometheus/trigger';
import { fullName, Container } from '../../model/container';

export interface TriggerConfiguration extends ComponentConfiguration {
    auto?: boolean;
    threshold?: string;
    mode?: string;
    once?: boolean;
    simpletitle?: string;
    simplebody?: string;
    batchtitle?: string;
}

export interface ContainerReport {
    container: Container;
    changed: boolean;
}

/**
 * Render body or title simple template.
 * @param template
 * @param container
 * @returns {*}
 */
function renderSimple(template: string, container: Container) {
    // Set deprecated vars for backward compatibility
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const id = container.id;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const name = container.name;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const watcher = container.watcher;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const kind =
        container.updateKind && container.updateKind.kind
            ? container.updateKind.kind
            : '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const semver =
        container.updateKind && container.updateKind.semverDiff
            ? container.updateKind.semverDiff
            : '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const local =
        container.updateKind && container.updateKind.localValue
            ? container.updateKind.localValue
            : '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const remote =
        container.updateKind && container.updateKind.remoteValue
            ? container.updateKind.remoteValue
            : '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const link =
        container.result && container.result.link ? container.result.link : '';

    return eval('`' + template + '`');
}

function renderBatch(template: string, containers: Container[]) {
    // Set deprecated vars for backward compatibility
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const count = containers ? containers.length : 0;

    return eval('`' + template + '`');
}

/**
 * Trigger base component.
 */
class Trigger extends Component {
    public configuration: TriggerConfiguration = {};

    /**
     * Return true if update reaches trigger threshold.
     * @param containerResult
     * @param threshold
     * @returns {boolean}
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
                case 'major-only':
                    thresholdPassing =
                        containerResult.updateKind.semverDiff == 'major';
                    break;
                case 'minor-only':
                    thresholdPassing =
                        containerResult.updateKind.semverDiff == 'minor';
                    break;
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
     * @returns
     */
    static parseIncludeOrIncludeTriggerString(
        includeOrExcludeTriggerString: string,
    ) {
        const includeOrExcludeTriggerSplit =
            includeOrExcludeTriggerString.split(/\s*:\s*/);
        const includeOrExcludeTrigger = {
            id: includeOrExcludeTriggerSplit[0],
            threshold: 'all',
        };
        if (includeOrExcludeTriggerSplit.length === 2) {
            switch (includeOrExcludeTriggerSplit[1]) {
                case 'major-only':
                    includeOrExcludeTrigger.threshold = 'major-only';
                    break;
                case 'minor-only':
                    includeOrExcludeTrigger.threshold = 'minor-only';
                    break;
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
     * @returns {Promise<void>}
     */
    async handleContainerReport(containerReport: ContainerReport) {
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
                        (this.configuration.threshold || 'all').toLowerCase(),
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
     * @returns {Promise<void>}
     */
    async handleContainerReports(containerReports: ContainerReport[]) {
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
                        (this.configuration.threshold || 'all').toLowerCase(),
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

    isTriggerIncluded(
        containerResult: Container,
        triggerInclude: string | undefined,
    ) {
        if (!triggerInclude) {
            return true;
        }
        return this.isTriggerIncludedOrExcluded(
            containerResult,
            triggerInclude,
        );
    }

    isTriggerExcluded(
        containerResult: Container,
        triggerExclude: string | undefined,
    ) {
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
     * @returns {boolean}
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
            if (
                this.configuration.mode &&
                this.configuration.mode.toLowerCase() === 'simple'
            ) {
                event.registerContainerReport(async (containerReport) =>
                    this.handleContainerReport(containerReport),
                );
            }
            if (
                this.configuration.mode &&
                this.configuration.mode.toLowerCase() === 'batch'
            ) {
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
     * @returns {*}
     */
    validateConfiguration(
        configuration: TriggerConfiguration,
    ): TriggerConfiguration {
        const schema = this.getConfigurationSchema();
        const schemaWithDefaultOptions = schema.append({
            auto: this.joi.bool().default(true),
            threshold: this.joi
                .string()
                .insensitive()
                .valid(
                    'all',
                    'major',
                    'minor',
                    'patch',
                    'major-only',
                    'minor-only',
                )
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
        if (schemaValidated.warning) {
            this.log.warn(schemaValidated.warning.message);
        }
        if (schemaValidated.error) {
            throw schemaValidated.error;
        }
        return schemaValidated.value ? schemaValidated.value : {};
    }

    /**
     * Init Trigger. Can be overridden in trigger implementation class.
     */

    initTrigger() {
        // do nothing by default
    }

    /**
     * Trigger method. Must be overridden in trigger implementation class.
     */

    trigger(containerWithResult: Container) {
        // do nothing by default
        this.log.warn(
            'Cannot trigger container result; this trigger does not implement "simple" mode',
        );
        return containerWithResult;
    }

    /**
     * Trigger batch method. Must be overridden in trigger implementation class.
     * @param containersWithResult
     * @returns {*}
     */
    triggerBatch(containersWithResult: Container[]) {
        // do nothing by default
        this.log.warn(
            'Cannot trigger container results; this trigger does not implement "batch" mode',
        );
        return containersWithResult;
    }

    /**
     * Render trigger title simple.
     * @param container
     * @returns {*}
     */
    renderSimpleTitle(container: Container) {
        return renderSimple(this.configuration.simpletitle!, container);
    }

    /**
     * Render trigger body simple.
     * @param container
     * @returns {*}
     */
    renderSimpleBody(container: Container) {
        return renderSimple(this.configuration.simplebody!, container);
    }

    /**
     * Render trigger title batch.
     * @param containers
     * @returns {*}
     */
    renderBatchTitle(containers: Container[]) {
        return renderBatch(this.configuration.batchtitle!, containers);
    }

    /**
     * Render trigger body batch.
     * @param containers
     * @returns {*}
     */
    renderBatchBody(containers: Container[]) {
        return containers
            .map((container) => `- ${this.renderSimpleBody(container)}\n`)
            .join('\n');
    }
}

export default Trigger;
