module.exports = {
    default: {
        paths: ['features/**/*.feature'],
        tags: process.argv.includes('@kubernetes')
            ? '@kubernetes'
            : 'not @skip and not @kubernetes',
    },
};
