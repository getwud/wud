const { Then } = require('@cucumber/cucumber');
const assert = require('assert');

// The rollback gate keeps the previous container as `<name>-wud-old-<ts>`.
// A leftover archive means either the rollback fixtures leaked into the shared
// set or the isolation of the rollback scenario broke.
Then(
    /^no container should be archived under a temporary rollback name$/,
    function checkNoRollbackArchives() {
        const response = this.apickli.getResponseObject();
        const body = JSON.parse(response.body);
        const archived = body
            .map((container) => container.name)
            .filter((name) => name.includes('-wud-old-'));

        assert.strictEqual(
            archived.length,
            0,
            `no container should be archived under a temporary rollback name, found: ${archived.join(', ')}`,
        );
    },
);
