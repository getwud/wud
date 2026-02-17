// @ts-nocheck
import util from 'node:util';
import child_process from 'node:child_process';
const exec = util.promisify(child_process.exec);
import Trigger from '../Trigger';

import { flatten } from '../../../model/container';
/**
 * Command Trigger implementation
 */
class Command extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            cmd: this.joi.string().required(),
            shell: this.joi.string().default('/bin/sh'),
            timeout: this.joi.number().min(0).default(60000),
        });
    }

    /**
     * Run the command with new image version details.
     *
     * @param container the container
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.runCommand({
            container_json: JSON.stringify(container),
            ...flatten(container),
        });
    }

    /**
     * Run the command with new image version details.
     * @param containers
     * @returns {Promise<*>}
     */
    async triggerBatch(containers) {
        return this.runCommand({
            containers_json: JSON.stringify(containers),
        });
    }

    /**
     * Run the command.
     * @param {*} extraEnvVars
     */
    async runCommand(extraEnvVars) {
        const commandOptions = {
            env: {
                ...process.env,
                ...extraEnvVars,
            },
            shell: this.configuration.shell,
            timeout: this.configuration.timeout,
        };
        try {
            const { stdout, stderr } = await exec(
                this.configuration.cmd,
                commandOptions,
            );
            if (stdout) {
                this.log.info(
                    `Command ${this.configuration.cmd} \nstdout ${stdout}`,
                );
            }
            if (stderr) {
                this.log.warn(
                    `Command ${this.configuration.cmd} \nstderr ${stderr}`,
                );
            }
        } catch (err) {
            this.log.warn(
                `Command ${this.configuration.cmd} \nexecution error (${err.message})`,
            );
        }
    }
}

export default Command;
