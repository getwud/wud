const fs = require('fs');
const files = [
    'app/watchers/providers/docker/Docker.ts',
    'app/watchers/providers/swarm/Swarm.ts',
    'app/watchers/providers/kubernetes/Kubernetes.ts',
    'app/watchers/providers/nomad/Nomad.ts'
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // find the Promise.all for containers.map(container => this.watchContainer(container))
    const regex = /const containerReports = await Promise\.all\([\s\S]*?containers\.map\(\(container\) => this\.watchContainer\(container\)\),[\s\S]*?\);/g;
    
    if (content.match(regex)) {
        content = content.replace(
            regex,
            'const containerReports = await this.processWatchContainers(containers);'
        );
        fs.writeFileSync(f, content);
        console.log('Patched', f);
    } else {
        console.log('Could not find match in', f);
    }
});
