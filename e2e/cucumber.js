function getTags() {
    if (process.argv.includes('@kubernetes')) {
        return '@kubernetes';
    }
    if (process.argv.includes('@nomad')) {
        return '@nomad';
    }
    return 'not @skip and not @kubernetes and not @nomad';
}

module.exports = {
    default: {
        paths: ['features/**/*.feature'],
        tags: getTags(),
    },
};
