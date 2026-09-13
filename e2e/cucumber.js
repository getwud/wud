function getTags() {
    if (process.argv.includes('@kubernetes')) {
        return '@kubernetes';
    }
    if (process.argv.includes('@nomad')) {
        return '@nomad';
    }
    if (process.argv.includes('@swarm')) {
        return '@swarm';
    }
    return 'not @skip and not @kubernetes and not @nomad and not @swarm';
}

module.exports = {
    default: {
        paths: ['features/**/*.feature'],
        tags: getTags(),
    },
};
