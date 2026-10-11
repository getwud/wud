import Component from '../registry/Component';
import { Container } from '../model/container';
import * as event from '../event';

export interface ReconcileOptions {
    /** Previous container ID that was superseded or replaced */
    oldContainerId?: string;
    /** Force image inspection even if record exists in store */
    forceRefresh?: boolean;
}

export interface ContainerReport {
    container: Container;
    changed: boolean;
}

/**
 * Watcher abstract class.
 */
abstract class Watcher extends Component {
    /**
     * Watch main method.
     * @returns {Promise<any[]>}
     */
    abstract watch(): Promise<any[]>;

    abstract getContainers(): Promise<Container[]>;

    /**
     * Reconcile a single container by ID without triggering a full engine sweep.
     * @param containerId The current/new container ID
     * @param options Reconcile options including superseded oldContainerId
     */
    async reconcileContainer(
        _containerId: string,
        _options?: ReconcileOptions,
    ): Promise<ContainerReport | undefined> {
        void _containerId;
        void _options;
        return undefined;
    }

    /**
     * Remove a deleted or superseded container from the state store and emit removal events.
     * @param containerId The ID of the container that was destroyed
     */
    async pruneContainerFromStore(_containerId: string): Promise<void> {
        void _containerId;
        // Base watcher no-op, implemented by orchestrator watchers
    }

    /**
     * Process a list of containers and emit progress.
     * @param containers
     * @returns {Promise<any[]>}
     */
    async processWatchContainers(containers: Container[]): Promise<any[]> {
        const total = containers.length;
        if (total > 0) {
            event.emitWatchStart({ watcher: this.name, total });
        }

        let processed = 0;
        try {
            const containerReports = await Promise.all(
                containers.map(async (container) => {
                    try {
                        const report = await this.watchContainer(container);
                        return report;
                    } finally {
                        processed++;
                        event.emitWatchProgress({
                            watcher: this.name,
                            processed,
                            total,
                            container,
                        });
                    }
                }),
            );
            return containerReports;
        } finally {
            if (total > 0) {
                event.emitWatchStop({ watcher: this.name, processed, total });
            }
        }
    }

    /**
     * Watch a Container.
     * @param container
     * @returns {Promise<any>}
     */
    protected readonly containerChecks = new Map<string, Promise<unknown>>();

    async watchContainer(container: Container) {
        const previous =
            this.containerChecks.get(container.id) ?? Promise.resolve();
        const check = previous
            .catch(() => undefined)
            .then(() => this.checkContainer(container));
        this.containerChecks.set(container.id, check);
        try {
            return await check;
        } finally {
            if (this.containerChecks.get(container.id) === check)
                this.containerChecks.delete(container.id);
        }
    }

    protected abstract checkContainer(container: Container): Promise<any>;
}

export default Watcher;
