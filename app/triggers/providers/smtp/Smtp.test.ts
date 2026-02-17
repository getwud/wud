// @ts-nocheck
import { ValidationError } from 'joi';
import Smtp from './Smtp';
import bunyan from 'bunyan';

const loggerBuffer = new bunyan.RingBuffer({ limit: 5 });
const log = bunyan.createLogger({
    name: 'Smtp.Tests',
    streams: [{ stream: loggerBuffer }],
});

const smtp = new Smtp();
smtp.log = log;

beforeEach(() => {
    loggerBuffer.records = [];
});

const configurationValid = {
    allowcustomtld: false,
    host: 'smtp.gmail.com',
    port: '465',
    user: 'user',
    pass: 'pass',
    from: {
        name: 'This is a display name',
        address: 'from@xx.com',
    },
    to: 'to@xx.com',
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

test('validateConfiguration should return validated configuration when valid', async () => {
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

test('trigger from value display name is optional', () => {
    const config = {
        ...configurationValid,
        from: { address: 'from@xx.com' },
    };

    const validatedConfiguration = smtp.validateConfiguration(config);

    expect(validatedConfiguration).toStrictEqual({
        ...config,
        port: 465,
        tls: {
            enabled: false,
            verify: true,
        },
    });
});

test('trigger from value provided as string address is correctly transformed to nodemailer model for backward compatibility and raise deprecation warning', () => {
    const fromAddress = 'from@xx.com';
    const config = {
        ...configurationValid,
        from: fromAddress,
    };

    const validatedConfiguration = smtp.validateConfiguration(config);

    expect(
        loggerBuffer.records.find((m) =>
            m.includes(Smtp.fromDeprecationWarningMessage),
        ),
    ).toBeDefined();
    expect(validatedConfiguration).toStrictEqual({
        ...configurationValid,
        port: 465,
        from: { address: fromAddress },
        tls: {
            enabled: false,
            verify: true,
        },
    });
});

test.each([
    { allowCustomTld: true, field: 'from' },
    { allowCustomTld: false, field: 'from' },
    { allowCustomTld: true, field: 'to' },
    { allowCustomTld: false, field: 'to' },
    { allowCustomTld: true, field: 'both' },
    { allowCustomTld: false, field: 'both' },
])(
    'trigger should $allowCustomTld allow custom tld for $field field',
    async ({ allowCustomTld, field }) => {
        const config = {
            ...configurationValid,
            allowcustomtld: allowCustomTld,
            from:
                field === 'from' || field == 'both'
                    ? 'user@domain.lan'
                    : configurationValid.from,
            to:
                field === 'to' || field == 'both'
                    ? 'user@domain.lan'
                    : configurationValid.to,
        };

        if (allowCustomTld) {
            expect(() => {
                smtp.validateConfiguration(config);
            }).not.toThrow(ValidationError);
        } else {
            expect(() => {
                smtp.validateConfiguration(config);
            }).toThrow(ValidationError);
        }
    },
);

test('validateConfiguration should throw error when invalid', async () => {
    const configuration = {
        host: 'smtp.gmail..com',
        port: 'xyz',
        from: 'from@@xx.com',
        to: 'to@@xx.com',
    };
    expect(() => {
        smtp.validateConfiguration(configuration);
    }).toThrow(ValidationError);
});

test('init should create a mailer transporter with expected configuration when called', async () => {
    smtp.configuration = configurationValid;
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

test('maskConfiguration should mask sensitive data', async () => {
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
