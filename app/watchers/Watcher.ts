import Component from '../registry/Component';
import { Container } from '../model/container';
import * as event from '../event';

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
        const containerReports = await Promise.all(
            containers.map(async (container) => {
                const report = await this.watchContainer(container);
                processed++;
                event.emitWatchProgress({
                    watcher: this.name,
                    processed,
                    total,
                    container,
                });
                return report;
            }),
        );

        event.emitWatchStop({ watcher: this.name, processed, total });
        return containerReports;
    }

    /**
     * Watch a Container.
     * @param container
     * @returns {Promise<any>}
     */
    private readonly containerChecks = new Map<string, Promise<unknown>>();

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
