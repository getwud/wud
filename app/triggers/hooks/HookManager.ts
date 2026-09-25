import { PassThrough } from 'stream';
import Dockerode from 'dockerode';
import Joi from 'joi';
import { Logger } from 'pino';
import { Container } from '../../model/container';
import { getState } from '../../registry';

export interface Hook {
    type: 'exec' | 'trigger';
    phase: 'pre' | 'post';
    command?: string;
    target?: string;
    trigger?: string;
    timeout?: number;
}

export interface HookContext {
    triggerName: string;
    dockerApi?: Dockerode;
    log: Logger;
}

export const hookSchema = Joi.object({
    type: Joi.string().valid('exec', 'trigger').required(),
    phase: Joi.string().valid('pre', 'post').required(),
    command: Joi.string().when('type', {
        is: 'exec',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    target: Joi.string().optional().default('self'),
    trigger: Joi.string().when('type', {
        is: 'trigger',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    timeout: Joi.number().default(60000),
});

/**
 * Parse hooks from container labels (e.g. wud.hook.1.phase=pre, wud.hook.1.type=exec, etc.).
 */
export function parseContainerHooks(labels?: Record<string, string>): Hook[] {
    if (!labels) {
        return [];
    }

    const hookMap = new Map<number, Partial<Hook>>();
    const regex =
        /^wud\.hook\.(\d+)\.(phase|type|command|target|trigger|timeout)$/i;

    for (const [key, value] of Object.entries(labels)) {
        const match = key.match(regex);
        if (match) {
            const index = parseInt(match[1], 10);
            const prop = match[2].toLowerCase();
            if (!hookMap.has(index)) {
                hookMap.set(index, {});
            }
            const hook = hookMap.get(index)!;
            if (prop === 'phase') {
                const normalized = value.toLowerCase();
                if (normalized === 'pre' || normalized === 'post') {
                    hook.phase = normalized;
                }
            } else if (prop === 'type') {
                const normalized = value.toLowerCase();
                if (normalized === 'exec' || normalized === 'trigger') {
                    hook.type = normalized;
                }
            } else if (prop === 'command') {
                hook.command = value;
            } else if (prop === 'target') {
                hook.target = value;
            } else if (prop === 'trigger') {
                hook.trigger = value;
            } else if (prop === 'timeout') {
                const parsedTimeout = parseInt(value, 10);
                if (!isNaN(parsedTimeout)) {
                    hook.timeout = parsedTimeout;
                }
            }
        }
    }

    const sortedIndices = Array.from(hookMap.keys()).sort((a, b) => a - b);
    const validHooks: Hook[] = [];

    for (const idx of sortedIndices) {
        const h = hookMap.get(idx)!;
        if (h.phase && h.type) {
            if (h.type === 'exec' && !h.command) {
                continue;
            }
            if (h.type === 'trigger' && !h.trigger) {
                continue;
            }
            validHooks.push({
                phase: h.phase,
                type: h.type,
                command: h.command,
                target: h.target || 'self',
                trigger: h.trigger,
                timeout: h.timeout !== undefined ? h.timeout : 60000,
            });
        }
    }

    return validHooks;
}

/**
 * Get all hooks applicable for a given phase, merging trigger global hooks with container labels.
 */
export function getHooksForPhase(
    phase: 'pre' | 'post',
    container: Container,
    globalHooks?: Hook[],
): Hook[] {
    const containerHooks = parseContainerHooks(container.labels);
    const normalizedGlobal = (globalHooks || []).map((h) => ({
        ...h,
        target: h.target || 'self',
        timeout: h.timeout !== undefined ? h.timeout : 60000,
    }));
    const merged = [...normalizedGlobal, ...containerHooks];
    return merged.filter((h) => h.phase === phase);
}

/**
 * Execute an exec hook (Type A or Type B) on a Docker container.
 */
async function executeExecHook(
    hook: Hook,
    container: Container,
    dockerApi: Dockerode,
    triggerName: string,
    log: Logger,
): Promise<void> {
    const isSelfTarget =
        !hook.target ||
        hook.target === 'self' ||
        hook.target === container.name ||
        hook.target === container.id;

    const targetIdOrName = isSelfTarget
        ? container.id || container.name
        : hook.target!;

    const targetContainer = dockerApi.getContainer(targetIdOrName);

    const imageName = container.image?.name || '';
    const imageRegistry = container.image?.registry?.name || '';
    const oldTag = container.image?.tag?.value || '';
    const newTag =
        container.updateKind?.remoteValue || container.result?.tag || '';

    const isOldDigest = oldTag.includes(':');
    const isNewDigest =
        container.updateKind?.kind === 'digest' || newTag.includes(':');

    const formatImageRef = (
        name: string,
        tagOrDigest: string,
        isDigest: boolean,
    ): string => {
        if (!name) {
            return '';
        }
        if (!tagOrDigest) {
            return name;
        }
        const sep = isDigest ? '@' : ':';
        return `${name}${sep}${tagOrDigest}`;
    };

    const imageOld = formatImageRef(imageName, oldTag, isOldDigest);
    const imageNew = formatImageRef(imageName, newTag, isNewDigest);

    const envVars = [
        `WUD_CONTAINER_NAME=${container.name || ''}`,
        `WUD_CONTAINER_ID=${container.id || ''}`,
        `WUD_IMAGE_NAME=${imageName}`,
        `WUD_IMAGE_REGISTRY=${imageRegistry}`,
        `WUD_IMAGE_OLD_TAG=${oldTag}`,
        `WUD_IMAGE_NEW_TAG=${newTag}`,
        `WUD_IMAGE_OLD=${imageOld}`,
        `WUD_IMAGE_NEW=${imageNew}`,
        `WUD_WATCHER_NAME=${container.watcher || ''}`,
        `WUD_TRIGGER_NAME=${triggerName || ''}`,
        `WUD_HOOK_PHASE=${hook.phase}`,
    ];

    log.info(
        `[Hook ${hook.phase}] Executing command on container '${targetIdOrName}': ${hook.command}`,
    );

    const exec = await targetContainer.exec({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ['sh', '-c', hook.command!],
        Env: envVars,
    });

    const stream = await exec.start({ Detach: false, Tty: false });

    let stdoutData = '';
    let stderrData = '';

    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();

    stdoutStream.on('data', (chunk) => {
        stdoutData += chunk.toString();
    });
    stderrStream.on('data', (chunk) => {
        stderrData += chunk.toString();
    });

    if (dockerApi.modem?.demuxStream) {
        dockerApi.modem.demuxStream(stream, stdoutStream, stderrStream);
    } else {
        stream.on('data', (chunk: Buffer | string) => {
            stdoutData += chunk.toString();
        });
    }

    const timeoutMs = hook.timeout || 60000;

    await new Promise<void>((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                const destroyable = stream as unknown as {
                    destroy?: () => void;
                };
                if (typeof destroyable.destroy === 'function') {
                    destroyable.destroy();
                }
                reject(
                    new Error(
                        `Hook command timed out after ${timeoutMs}ms: ${hook.command}`,
                    ),
                );
            }
        }, timeoutMs);

        const onEnd = () => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve();
            }
        };

        stream.on('end', onEnd);
        stream.on('close', onEnd);
        stream.on('error', (err) => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                reject(err);
            }
        });
    });

    let inspectInfo = await exec.inspect();
    let inspectRetries = 0;
    while (inspectInfo.Running && inspectRetries < 50) {
        await new Promise((r) => setTimeout(r, 50));
        inspectInfo = await exec.inspect();
        inspectRetries++;
    }

    if (stdoutData.trim()) {
        log.info(
            `[Hook ${hook.phase}] stdout (${targetIdOrName}): ${stdoutData.trim()}`,
        );
    }
    if (stderrData.trim()) {
        log.warn(
            `[Hook ${hook.phase}] stderr (${targetIdOrName}): ${stderrData.trim()}`,
        );
    }

    if (inspectInfo.ExitCode !== 0) {
        const errorDetails = stderrData.trim()
            ? `\nStderr: ${stderrData.trim()}`
            : '';
        throw new Error(
            `Hook command failed with exit code ${inspectInfo.ExitCode}: ${hook.command}${errorDetails}`,
        );
    }
}

/**
 * Execute a trigger hook (Type C) calling an existing WUD trigger.
 */
async function executeTriggerHook(
    hook: Hook,
    container: Container,
    triggerName: string,
    log: Logger,
): Promise<void> {
    const triggers = getState().trigger || {};
    let targetTrigger = triggers[hook.trigger!];

    if (!targetTrigger) {
        for (const [id, t] of Object.entries(triggers)) {
            if (
                t.name === hook.trigger ||
                t.type === hook.trigger ||
                id.endsWith(`.${hook.trigger}`)
            ) {
                targetTrigger = t;
                break;
            }
        }
    }

    if (!targetTrigger) {
        throw new Error(`Trigger '${hook.trigger}' not found`);
    }

    log.info(
        `[Hook ${hook.phase}] Triggering chained trigger '${hook.trigger}' for container '${container.name}'`,
    );

    const enrichedContainer: Container = {
        ...container,
        result: {
            ...container.result,
            hook: {
                phase: hook.phase,
                parentTrigger: triggerName,
            },
        },
    };

    const timeoutMs = hook.timeout || 60000;
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(
                new Error(
                    `Trigger hook '${hook.trigger}' timed out after ${timeoutMs}ms`,
                ),
            );
        }, timeoutMs);
    });

    try {
        await Promise.race([
            targetTrigger.trigger(enrichedContainer),
            timeoutPromise,
        ]);
    } finally {
        clearTimeout(timer!);
    }
}

/**
 * HookManager coordinates running pre- and post-update hooks.
 */
export class HookManager {
    /**
     * Run all pre-update hooks. Throws an Error if any hook fails.
     */
    static async runPreHooks(
        container: Container,
        globalHooks: Hook[] | undefined,
        context: HookContext,
    ): Promise<void> {
        return this.runHooks('pre', container, globalHooks, context);
    }

    /**
     * Run all post-update hooks. Throws an Error if any hook fails.
     */
    static async runPostHooks(
        container: Container,
        globalHooks: Hook[] | undefined,
        context: HookContext,
    ): Promise<void> {
        return this.runHooks('post', container, globalHooks, context);
    }

    /**
     * Run hooks for a specific phase in sequential order.
     */
    static async runHooks(
        phase: 'pre' | 'post',
        container: Container,
        globalHooks: Hook[] | undefined,
        context: HookContext,
    ): Promise<void> {
        const hooks = getHooksForPhase(phase, container, globalHooks);
        if (hooks.length === 0) {
            return;
        }

        context.log.info(
            `Running ${hooks.length} ${phase}-update hook(s) for container '${container.name}'`,
        );

        for (const hook of hooks) {
            if (hook.type === 'exec') {
                if (!context.dockerApi) {
                    throw new Error(
                        `Docker API is required to execute ${phase}-update exec hook`,
                    );
                }
                await executeExecHook(
                    hook,
                    container,
                    context.dockerApi,
                    context.triggerName,
                    context.log,
                );
            } else if (hook.type === 'trigger') {
                await executeTriggerHook(
                    hook,
                    container,
                    context.triggerName,
                    context.log,
                );
            }
        }
    }
}

export default HookManager;
