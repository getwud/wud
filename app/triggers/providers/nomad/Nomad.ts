import axios from 'axios';
import Trigger from '../Trigger';
import { ComponentConfiguration } from '../../../registry/Component';
import { Container, fullName } from '../../../model/container';

/**
 * Restart the HashiCorp Nomad allocation/task backing a watched container.
 *
 * Unlike the `docker`/`dockercompose` triggers, this never touches the
 * Docker API to stop/remove/create a container directly. Containers
 * started by Nomad are supervised by it (service registration, health
 * checks, template-rendered secrets, restart policy) and deleting one
 * out from under Nomad causes it to treat the disappearance as a task
 * failure and reconcile independently, fighting whatever just replaced
 * it. Instead, this trigger asks Nomad itself to restart the task,
 * which re-runs the driver's image pull (when `force_pull = true` is
 * set on the task, image pulls are not cached) and keeps the
 * allocation under Nomad's normal supervision throughout.
 *
 * Nomad stamps every container it creates with a fixed set of labels
 * (see hashicorp/nomad drivers/docker/driver.go):
 *   - com.hashicorp.nomad.alloc_id
 *   - com.hashicorp.nomad.task_name
 *   - com.hashicorp.nomad.job_name
 *   - com.hashicorp.nomad.job_id
 *   - com.hashicorp.nomad.task_group_name
 * This trigger reads the first two to target the restart. Not every
 * Nomad version sets the task_name label (observed missing entirely
 * on v2.0.4 while alloc_id was present), so as a fallback it also
 * derives the task name from the container name itself, which Nomad's
 * Docker driver always builds as "<task_name>-<alloc_id>"
 * (drivers/docker/driver.go: `fmt.Sprintf("%s-%s", task.Name,
 * task.AllocID)`) -- stripping the trailing "-<alloc_id>" recovers the
 * task name reliably without depending on that label existing.
 */
class Nomad extends Trigger {
    /**
     * Get the Trigger configuration schema.
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            address: this.joi
                .string()
                .uri({ scheme: ['http', 'https'] })
                .default('http://127.0.0.1:4646'),
            token: this.joi.string(),
            alloclabel: this.joi
                .string()
                .default('com.hashicorp.nomad.alloc_id'),
            tasklabel: this.joi
                .string()
                .default('com.hashicorp.nomad.task_name'),
            alltasks: this.joi.boolean().default(false),
        });
    }

    /**
     * Mask the token when logging configuration.
     */
    maskConfiguration(
        configuration?: ComponentConfiguration,
    ): ComponentConfiguration {
        const config = configuration || this.configuration;
        return {
            ...config,
            token: Nomad.mask(config.token),
        };
    }

    /**
     * Derive the task name for this container, falling back to parsing
     * it from the container name (Nomad always names containers
     * "<task_name>-<alloc_id>") when the task_name label is absent.
     */
    getTaskName(container: Container, allocId: string): string | undefined {
        const labeled = container.labels?.[this.configuration.tasklabel];
        if (labeled) {
            return labeled;
        }
        const suffix = `-${allocId}`;
        if (container.name && container.name.endsWith(suffix)) {
            return container.name.slice(0, -suffix.length);
        }
        return undefined;
    }

    /**
     * Restart the Nomad allocation (or a single task within it) backing
     * this container.
     */
    async trigger(container: Container) {
        const logContainer = this.log.child({
            container: fullName(container),
        });

        const allocId = container.labels?.[this.configuration.alloclabel];
        if (!allocId) {
            logContainer.warn(
                `Container has no ${this.configuration.alloclabel} label; not a Nomad-managed container, skipping`,
            );
            return;
        }

        const body: { TaskName?: string; AllTasks?: boolean } = {};
        if (this.configuration.alltasks) {
            body.AllTasks = true;
        } else {
            const taskName = this.getTaskName(container, allocId);
            if (taskName) {
                body.TaskName = taskName;
            } else {
                logContainer.warn(
                    `Could not determine task name for allocation ${allocId} (no ${this.configuration.tasklabel} label and container name did not match "<task>-${allocId}"); ` +
                        'refusing to restart the whole allocation implicitly -- set alltasks=true if that is what you want',
                );
                return;
            }
        }

        const headers: Record<string, string> = {};
        if (this.configuration.token) {
            headers['X-Nomad-Token'] = this.configuration.token;
        }

        logContainer.info(
            `Restart Nomad allocation ${allocId}${body.TaskName ? ` (task ${body.TaskName})` : ''}`,
        );
        try {
            await axios.post(
                `${this.configuration.address}/v1/client/allocation/${allocId}/restart`,
                body,
                { headers },
            );
            logContainer.info(
                `Nomad allocation ${allocId} restarted with success`,
            );
        } catch (e: any) {
            logContainer.warn(
                `Error when restarting Nomad allocation ${allocId} (${e.message})`,
            );
            throw e;
        }
    }

    /**
     * Restart the Nomad allocations backing these containers.
     */
    async triggerBatch(containers: Container[]) {
        await Promise.all(
            containers.map((container) => this.trigger(container)),
        );
    }
}

export default Nomad;
