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
    abstract watchContainer(container: Container): Promise<any>;
}

export default Watcher;
