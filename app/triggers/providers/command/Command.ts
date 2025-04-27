import util from 'node:util';
import { exec as _exec } from 'child_process';
const exec = util.promisify(_exec);
import { Trigger, TriggerConfiguration } from '../Trigger';
import { Container, flatten } from '../../../model/container';
import { ExecOptions } from 'node:child_process';

export interface CommandConfig extends TriggerConfiguration {
    cmd: string; // Command to execute
    shell: string; // Shell to use for command execution
    timeout: number; // Timeout for command execution
}

/**
 * Command Trigger implementation
 */
export class Command extends Trigger<CommandConfig> {
    /**
     * Get the Trigger configuration schema.
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
     */
    async trigger(container: Container) {
        return this.runCommand({
            container_json: JSON.stringify(container),
            ...flatten(container),
        });
    }

    /**
     * Run the command with new image version details.
     * @param containers
     */
    async triggerBatch(containers: Container[]) {
        return this.runCommand({
            containers_json: JSON.stringify(containers),
        });
    }

    /**
     * Run the command.
     * @param {*} extraEnvVars
     */
    async runCommand(extraEnvVars: Record<string, any>) {
        const commandOptions: ExecOptions = {
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
        } catch (err: any) {
            this.log.warn(
                `Command ${this.configuration.cmd} \nexecution error (${err.message})`,
            );
        }
    }
}
