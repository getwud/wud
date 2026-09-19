const fs = require('fs');
let content = fs.readFileSync('app/watchers/Watcher.ts', 'utf8');

if (!content.includes('processWatchContainers')) {
    content = content.replace(
        "import { Container } from '../model/container';",
        "import { Container } from '../model/container';\nimport * as event from '../event';"
    );
    
    const processMethod = `
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
            })
        );

        event.emitWatchStop({ watcher: this.name, processed, total });
        return containerReports;
    }
`;
    
    content = content.replace(
        'abstract watch(): Promise<any[]>;',
        'abstract watch(): Promise<any[]>;\n' + processMethod
    );
    
    fs.writeFileSync('app/watchers/Watcher.ts', content);
}
