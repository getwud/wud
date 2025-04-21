import { ValidationError } from 'joi';

import { Gotify, GotifyConfiguration } from './Gotify';

const gotify = new Gotify();

const configurationValid: GotifyConfiguration = {
    url: 'http://xxx.com',
    token: 'xxx',
    priority: 2,
    mode: 'simple',
    threshold: 'all',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',
    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',

    batchtitle: '${containers.length} updates available',
};

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        gotify.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    } as GotifyConfiguration;
    expect(() => {
        gotify.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});
