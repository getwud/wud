import { ValidationError } from 'joi';

import { Command, CommandConfig } from './Command';

const command = new Command();

const configurationValid: CommandConfig = {
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

beforeEach(() => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        command.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should apply_default_configuration', () => {
    const validatedConfiguration = command.validateConfiguration({
        cmd: configurationValid.cmd,
    } as CommandConfig);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        command: 123456789,
    } as unknown as CommandConfig;
    expect(() => {
        command.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});
