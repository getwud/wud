const { ValidationError } = require('joi');
const Smtp = require('./Smtp');
const log = require('../../../log');

const smtp = new Smtp();

const configurationValid = {
    host: 'smtp.gmail.com',
    port: '465',
    user: 'user',
    pass: 'pass',
    from: 'from@xx.com',
    to: 'to@xx.com',
    threshold: 'all',
    mode: 'simple',
    once: true,

    simpletitle: 'New ${kind} found for container ${name}',

    simplebody:
        'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',

    batchtitle: '${count} updates available',
};

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        smtp.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        port: 465,
        tls: {
            enabled: false,
            verify: true,
        },
    });
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        host: 'smtp.gmail..com',
        port: 'xyz',
        from: 'from@@xx.com',
        to: 'to@@xx.com',
    };
    expect(() => {
        smtp.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('init should create a mailer transporter with expected configuration when called', () => {
    smtp.configuration = configurationValid;
    smtp.log = log;
    smtp.init();
    expect(smtp.transporter.options).toEqual(
        expect.objectContaining({
            host: configurationValid.host,
            port: configurationValid.port,
            auth: {
                user: configurationValid.user,
                pass: configurationValid.pass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        }),
    );
});

test('maskConfiguration should mask sensitive data', () => {
    smtp.configuration = {
        host: configurationValid.host,
        port: configurationValid.port,
        user: configurationValid.user,
        pass: configurationValid.pass,
    };
    expect(smtp.maskConfiguration()).toEqual({
        host: configurationValid.host,
        port: configurationValid.port,
        user: configurationValid.user,
        pass: 'p**s',
    });
});

test('trigger should format mail as expected', async () => {
    smtp.configuration = configurationValid;
    smtp.transporter = {
        sendMail: (conf) => conf,
    };
    const response = await smtp.trigger({
        id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
        name: 'homeassistant',
        watcher: 'local',
        includeTags: '^\\d+\\.\\d+.\\d+$',
        image: {
            id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
            },
            name: 'test',
            tag: {
                value: '2021.6.4',
                semver: true,
            },
            digest: {
                watch: false,
                repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
            },
            architecture: 'amd64',
            os: 'linux',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            link: 'https://test-2.0.0/changelog',
        },
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
    });
    expect(response.text).toEqual(
        'Container homeassistant running with tag 1.0.0 can be updated to tag 2.0.0\nhttps://test-2.0.0/changelog',
    );
});

test('triggerBatch should format mail as expected', async () => {
    smtp.configuration = configurationValid;
    smtp.transporter = {
        sendMail: (conf) => conf,
    };
    const response = await smtp.triggerBatch([
        {
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            includeTags: '^\\d+\\.\\d+.\\d+$',
            image: {
                id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
                registry: {
                    url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
                },
                name: 'test',
                tag: {
                    value: '2021.6.4',
                    semver: true,
                },
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                link: 'https://test-2.0.0/changelog',
            },
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        },
        {
            id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
            name: 'homeassistant',
            watcher: 'local',
            includeTags: '^\\d+\\.\\d+.\\d+$',
            image: {
                id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
                registry: {
                    url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
                },
                name: 'test',
                tag: {
                    value: '2021.6.4',
                    semver: true,
                },
                digest: {
                    watch: false,
                    repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
                },
                architecture: 'amd64',
                os: 'linux',
                created: '2021-06-12T05:33:38.440Z',
            },
            result: {
                link: 'https://test-2.0.0/changelog',
            },
            updateKind: {
                kind: 'tag',
                localValue: '1.0.0',
                remoteValue: '2.0.0',
            },
        },
    ]);
    expect(response.text).toEqual(
        '- Container homeassistant running with tag 1.0.0 can be updated to tag 2.0.0\nhttps://test-2.0.0/changelog\n\n- Container homeassistant running with tag 1.0.0 can be updated to tag 2.0.0\nhttps://test-2.0.0/changelog\n',
    );
});
