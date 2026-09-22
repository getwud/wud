const { When, Then } = require('@cucumber/cucumber');
const { spawnSync } = require('child_process');
const assert = require('assert');

function runOneshot(commandArgs) {
    const result = spawnSync(
        'docker',
        [
            'exec',
            'wud',
            'env',
            'WUD_RUN_MODE=oneshot',
            'node',
            'dist/index',
            ...commandArgs,
        ],
        { encoding: 'utf8' },
    );
    return {
        exitCode: result.status,
        stdout: result.stdout ? result.stdout.toString() : '',
        stderr: result.stderr ? result.stderr.toString() : '',
    };
}

// A full one-shot scan performs live registry lookups for every container,
// which takes minutes against the remote registries used by the e2e fixtures.
const ONE_SHOT_STEP_TIMEOUT = 600 * 1000; // 10 minutes

When(/^I run the WUD one-shot watch command$/, function runOneShotWatch() {
    this.oneshotResult = runOneshot(['watch']);
}, ONE_SHOT_STEP_TIMEOUT);

When(
    /^I run the WUD one-shot watch command with (.*)$/,
    function runOneShotWatchWithOption(option) {
        this.oneshotResult = runOneshot(['watch', option]);
    },
);

When(
    /^I run the WUD one-shot (version|--help) command$/,
    function runOneShotSimpleCommand(command) {
        this.oneshotResult = runOneshot([command]);
    },
);

Then(
    /^the one-shot exit code should be (\d+)$/,
    function checkOneShotExitCode(expectedExitCode) {
        assert.strictEqual(
            this.oneshotResult.exitCode,
            Number(expectedExitCode),
            `expected exit code ${expectedExitCode}, got ${this.oneshotResult.exitCode}`,
        );
    },
);

Then(
    /^the one-shot stdout should be a valid JSON array$/,
    function checkOneShotJsonArray() {
        const parsed = JSON.parse(this.oneshotResult.stdout);
        assert.ok(
            Array.isArray(parsed),
            `stdout must be a JSON array, got: ${this.oneshotResult.stdout.slice(0, 200)}`,
        );
        this.oneshotContainers = parsed;
    },
);

Then(
    /^the one-shot stdout should contain the container (.*) with an available update$/,
    function checkOneShotContainerUpdated(containerName) {
        const container = this.oneshotContainers.find(
            (candidate) => candidate.name === containerName,
        );
        assert.ok(container, `container "${containerName}" not found in output`);
        assert.strictEqual(
            container.updateAvailable,
            true,
            `container "${containerName}" should report an available update`,
        );
    },
);

Then(
    /^the one-shot stderr should contain the mock trigger invocation$/,
    function checkOneShotMockTrigger() {
        assert.ok(
            this.oneshotResult.stderr.includes('MOCK triggered'),
            `stderr should contain the mock trigger invocation, got: ${this.oneshotResult.stderr.slice(0, 500)}`,
        );
    },
);

Then(
    /^the one-shot stdout should match the WUD version pattern$/,
    function checkOneShotVersion() {
        // The e2e image is built with WUD_VERSION=local; CI builds use a semver tag.
        assert.match(
            this.oneshotResult.stdout.trim(),
            /^(local|\d+\.\d+\.\d+(-[a-z0-9.]+)?)$/,
            `stdout should be the WUD version, got: ${this.oneshotResult.stdout}`,
        );
    },
);
