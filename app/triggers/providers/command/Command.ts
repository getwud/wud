import util from 'node:util';
import child_process, { ExecException } from 'node:child_process';
import { ObjectSchema } from 'joi';
import Trigger, { TriggerConfiguration } from '../Trigger';
import { Container, flatten } from '../../../model/container';

const exec = util.promisify(child_process.exec);

export interface CommandTriggerConfiguration extends TriggerConfiguration {
    cmd?: string;
    shell?: string;
    timeout?: number;
}

/**
 * Command Trigger implementation
 */
class Command extends Trigger {
    declare public configuration: CommandTriggerConfiguration;

    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema(): ObjectSchema {
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
    async trigger(container: Container) {
        const composeProject =
            container.stack || container.labels?.['com.docker.compose.project'];
        const composeEnvVars: Record<string, string> = composeProject
            ? {
                  compose_project: composeProject,
                  WUD_CONTAINER_COMPOSE_PROJECT: composeProject,
              }
            : {};
        return this.runCommand({
            container_json: JSON.stringify(container),
            ...flatten(container),
            ...composeEnvVars,
        });
    }

    /**
     * Run the command with new image version details.
     * @param containers
     * @returns {Promise<*>}
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
    async runCommand(extraEnvVars: Record<string, string>) {
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
                this.configuration.cmd!,
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
        } catch (err: unknown) {
            const execError = err as ExecException & {
                stdout?: string | Buffer;
                stderr?: string | Buffer;
            };
            this.log.warn(
                `Command ${this.configuration.cmd} \nexecution error (${execError.message})`,
            );
            if (execError.stdout) {
                this.log.info(
                    `Command ${this.configuration.cmd} \nstdout ${execError.stdout.toString()}`,
                );
            }
            if (execError.stderr) {
                this.log.warn(
                    `Command ${this.configuration.cmd} \nstderr ${execError.stderr.toString()}`,
                );
            }
        }
    }
}

export default Command;
