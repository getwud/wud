import Component from '../registry/Component';
import { Container } from '../model/container';

/**
 * Watcher abstract class.
 */
abstract class Watcher extends Component {
    /**
     * Watch main method.
     * @returns {Promise<any[]>}
     */
    async watch(): Promise<any[]> {
        const event = require('../event');
        let containers: Container[] = [];

        // Dispatch event to notify start watching
        event.emitWatcherStart(this);

        try {
            containers = await (this as any).getContainers();
        } catch (e: any) {
            this.log.warn(
                `Error when trying to get the list of containers to watch (${e.message})`,
            );
        }

        const total = containers.length;
        if (total > 0) {
            event.emitWatchStart({ watcher: this.name, total });
        }

        let processed = 0;
        const containerReports = [];

        // We can still run them in parallel or sequentially. To emit progress well, let's run them in parallel but update a counter.
        await Promise.all(
            containers.map(async (container) => {
                try {
                    const report = await this.watchContainer(container);
                    containerReports.push(report);
                } catch (e) {
                    this.log.warn(`Error watching container (${e.message})`);
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

        event.emitContainerReports(containerReports);
        event.emitWatcherStop(this);
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
