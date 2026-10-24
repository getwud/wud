import { ValidationError } from 'joi';
import Command from './Command';
import Trigger from '../Trigger';
import { Container } from '../../../model/container';

const command = new Command();

const configurationValid = {
    cmd: 'echo "hello"',
    timeout: 60000,
    shell: '/bin/sh',
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',
    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
    batchtitle: '${containers.length} updates available',
};

beforeEach(async () => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', async () => {
    const validatedConfiguration =
        command.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        preload: false,
        rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
        events: ['available'],
        successtitle: 'Update SUCCESS for ${container.name}',
        successbody:
            'Container ${container.name} has been successfully updated.',
        failuretitle: 'Update FAILED for ${container.name}',
        failurebody: 'Container ${container.name} update failed: ${error}',
        rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
    });
});

test('validateConfiguration should apply_default_configuration', async () => {
    const validatedConfiguration = command.validateConfiguration({
        cmd: configurationValid.cmd,
    });
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        preload: false,
        rollbacktitle: Trigger.DEFAULT_ROLLBACK_TITLE,
        events: ['available'],
        successtitle: 'Update SUCCESS for ${container.name}',
        successbody:
            'Container ${container.name} has been successfully updated.',
        failuretitle: 'Update FAILED for ${container.name}',
        failurebody: 'Container ${container.name} update failed: ${error}',
        rollbackbody: Trigger.DEFAULT_ROLLBACK_BODY,
    });
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        command: 123456789,
    };
    expect(() => {
        command.validateConfiguration(configuration);
    }).toThrow(ValidationError);
});

test('should trigger with container', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', { cmd: 'echo test' });
    const logSpy = jest.spyOn(cmd.log, 'info');

    const container = { name: 'test', id: '123' } as unknown as Container;
    await cmd.trigger(container);

    expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command echo test'),
    );
});

test('should trigger batch with containers', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', { cmd: 'echo batch' });
    const logSpy = jest.spyOn(cmd.log, 'info');

    const containers = [
        { name: 'test1' },
        { name: 'test2' },
    ] as unknown as Container[];
    await cmd.triggerBatch(containers);

    expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command echo batch'),
    );
});

test('should handle command execution error', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'invalid-command',
    });
    const logSpy = jest.spyOn(cmd.log, 'warn');

    const container = { name: 'test' } as unknown as Container;
    await cmd.trigger(container);

    expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('execution error'),
    );
});

test('should log stderr when present on successful command', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'echo warning >&2',
    });
    const logSpy = jest.spyOn(cmd.log, 'warn');

    const container = { name: 'test' } as unknown as Container;
    await cmd.trigger(container);

    expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('stderr warning'),
    );
});

test('should log both stdout and stderr when command fails', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'sh -c "echo error_out; echo error_err >&2; exit 1"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');
    const logWarnSpy = jest.spyOn(cmd.log, 'warn');

    const container = { name: 'test' } as unknown as Container;
    await cmd.trigger(container);

    expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('execution error'),
    );
    expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('stdout error_out'),
    );
    expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('stderr error_err'),
    );
});

test('should log stdout only when command fails with stdout and no stderr', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'sh -c "echo only_stdout; exit 2"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');
    const logWarnSpy = jest.spyOn(cmd.log, 'warn');

    const container = { name: 'test' } as unknown as Container;
    await cmd.trigger(container);

    expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('execution error'),
    );
    expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('stdout only_stdout'),
    );
    // stderr should not have been logged since it's empty
    expect(logWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('stderr'),
    );
});

test('should log stderr only when command fails with stderr and no stdout', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'sh -c "echo only_stderr >&2; exit 3"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');
    const logWarnSpy = jest.spyOn(cmd.log, 'warn');

    const container = { name: 'test' } as unknown as Container;
    await cmd.trigger(container);

    expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('execution error'),
    );
    expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('stderr only_stderr'),
    );
    expect(logInfoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('stdout'),
    );
});

test('should inject compose_project and WUD_CONTAINER_COMPOSE_PROJECT when container has stack', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'echo "proj=$compose_project,wud_proj=$WUD_CONTAINER_COMPOSE_PROJECT"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');

    const container = {
        name: 'web',
        stack: 'homelab',
    } as unknown as Container;
    await cmd.trigger(container);

    expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('proj=homelab,wud_proj=homelab'),
    );
});

test('should inject compose_project and WUD_CONTAINER_COMPOSE_PROJECT when container has com.docker.compose.project label', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'echo "proj=$compose_project,wud_proj=$WUD_CONTAINER_COMPOSE_PROJECT"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');

    const container = {
        name: 'web',
        labels: {
            'com.docker.compose.project': 'docker-compose-stack',
        },
    } as unknown as Container;
    await cmd.trigger(container);

    expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining(
            'proj=docker-compose-stack,wud_proj=docker-compose-stack',
        ),
    );
});

test('should prefer container.stack when both stack and com.docker.compose.project label are present', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'echo "proj=$compose_project,wud_proj=$WUD_CONTAINER_COMPOSE_PROJECT"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');

    const container = {
        name: 'web',
        stack: 'preferred-stack',
        labels: {
            'com.docker.compose.project': 'ignored-label',
        },
    } as unknown as Container;
    await cmd.trigger(container);

    expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining(
            'proj=preferred-stack,wud_proj=preferred-stack',
        ),
    );
});

test('should not inject compose_project env vars when container is not part of a compose project', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'echo "proj=${compose_project:-unset},wud_proj=${WUD_CONTAINER_COMPOSE_PROJECT:-unset}"',
        auto: false,
    });
    const logInfoSpy = jest.spyOn(cmd.log, 'info');

    const container = {
        name: 'standalone',
    } as unknown as Container;
    await cmd.trigger(container);

    expect(logInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('proj=unset,wud_proj=unset'),
    );
});
