// @ts-nocheck
import { ValidationError } from 'joi';

import Command from './Command';

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
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', async () => {
    const validatedConfiguration = command.validateConfiguration({
        cmd: configurationValid.cmd,
    });
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        command: 123456789,
    };
    expect(() => {
        command.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('should trigger with container', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', { cmd: 'echo test' });
    const logSpy = jest.spyOn(cmd.log, 'info');

    const container = { name: 'test', id: '123' };
    await cmd.trigger(container);

    expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command echo test'),
    );
});

test('should trigger batch with containers', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', { cmd: 'echo batch' });
    const logSpy = jest.spyOn(cmd.log, 'info');

    const containers = [{ name: 'test1' }, { name: 'test2' }];
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

    const container = { name: 'test' };
    await cmd.trigger(container);

    expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('execution error'),
    );
});

test('should log stderr when present', async () => {
    const cmd = new Command();
    await cmd.register('trigger', 'command', 'test', {
        cmd: 'echo warning >&2',
    });
    const logSpy = jest.spyOn(cmd.log, 'warn');

    const container = { name: 'test' };
    await cmd.trigger(container);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('stderr'));
});
