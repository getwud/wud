// Per-adapter rollback specs (blueprint §9.5). Each notification provider is
// exercised through its own transport primitive, stubbed exactly at the point
// its existing `trigger()` test intercepts it, and asserted to receive the
// rendered rollback content.
import Amqp from './amqp/Amqp';
import Bark from './bark/Bark';
import Discord from './discord/Discord';
import Gotify from './gotify/Gotify';
import Homeassistant from './homeassistant/Homeassistant';
import Ifttt from './ifttt/Ifttt';
import Kafka from './kafka/Kafka';
import Matrix from './matrix/Matrix';
import Mattermost from './mattermost/Mattermost';
import Nats from './nats/Nats';
import Ntfy from './ntfy/Ntfy';
import Opsgenie from './opsgenie/Opsgenie';
import Pagerduty from './pagerduty/Pagerduty';
import Prowl from './prowl/Prowl';
import Pushover from './pushover/Pushover';
import Rocketchat from './rocketchat/Rocketchat';
import Signal from './signal/Signal';
import Smtp from './smtp/Smtp';
import Telegram from './telegram/Telegram';
import Uptimekuma from './uptimekuma/Uptimekuma';
import Whatsapp from './whatsapp/Whatsapp';
import Zulip from './zulip/Zulip';

const report = {
    scope: 'container',
    container: { name: 'web', id: 'web-id' },
    oldImageRef: 'test/web:1.0.0',
    newImageRef: 'test/web:2.0.0',
    reason: 'unhealthy',
    status: 'succeeded',
};

type Adapter = { provider: any; transport: jest.Mock };

function adapter(
    ProviderClass: any,
    configure: (p: any) => jest.Mock,
): Adapter {
    const provider: any = new ProviderClass();
    provider.configuration = {};
    const transport = configure(provider);
    return { provider, transport };
}

const ADAPTERS: [string, () => Adapter][] = [
    ['amqp', () => adapter(Amqp, (p) => (p.publishMessage = jest.fn()))],
    ['bark', () => adapter(Bark, (p) => (p.sendMessage = jest.fn()))],
    ['discord', () => adapter(Discord, (p) => (p.sendMessage = jest.fn()))],
    [
        'gotify',
        () =>
            adapter(Gotify, (p) => {
                p.client = { message: { createMessage: jest.fn() } };
                return p.client.message.createMessage;
            }),
    ],
    [
        'homeassistant',
        () => adapter(Homeassistant, (p) => (p.sendWebhook = jest.fn())),
    ],
    ['ifttt', () => adapter(Ifttt, (p) => (p.sendHttpRequest = jest.fn()))],
    [
        'kafka',
        () =>
            adapter(Kafka, (p) => {
                const send = jest.fn();
                p.kafka = { producer: () => ({ connect: jest.fn(), send }) };
                return send;
            }),
    ],
    ['matrix', () => adapter(Matrix, (p) => (p.sendMessage = jest.fn()))],
    [
        'mattermost',
        () => adapter(Mattermost, (p) => (p.sendMessage = jest.fn())),
    ],
    ['nats', () => adapter(Nats, (p) => (p.publishMessage = jest.fn()))],
    ['ntfy', () => adapter(Ntfy, (p) => (p.sendHttpRequest = jest.fn()))],
    ['opsgenie', () => adapter(Opsgenie, (p) => (p.sendAlert = jest.fn()))],
    ['pagerduty', () => adapter(Pagerduty, (p) => (p.sendEvent = jest.fn()))],
    ['prowl', () => adapter(Prowl, (p) => (p.sendMessage = jest.fn()))],
    ['pushover', () => adapter(Pushover, (p) => (p.sendMessage = jest.fn()))],
    [
        'rocketchat',
        () => adapter(Rocketchat, (p) => (p.postMessage = jest.fn())),
    ],
    ['signal', () => adapter(Signal, (p) => (p.sendMessage = jest.fn()))],
    [
        'smtp',
        () =>
            adapter(Smtp, (p) => {
                p.transporter = { sendMail: jest.fn() };
                return p.transporter.sendMail;
            }),
    ],
    [
        'telegram',
        () =>
            adapter(Telegram, (p) => {
                p.configuration = { messageformat: 'Markdown' };
                return (p.sendMessage = jest.fn());
            }),
    ],
    ['uptimekuma', () => adapter(Uptimekuma, (p) => (p.sendPush = jest.fn()))],
    ['whatsapp', () => adapter(Whatsapp, (p) => (p.sendMessage = jest.fn()))],
    ['zulip', () => adapter(Zulip, (p) => (p.sendMessage = jest.fn()))],
];

describe('rollback notification adapters (§9.5)', () => {
    test.each(ADAPTERS)(
        '%s delivers the rendered rollback content through its transport',
        async (_name, build) => {
            const { provider, transport } = build();

            await provider.triggerRollback(report);

            expect(transport).toHaveBeenCalled();
            const payload = JSON.stringify(transport.mock.calls[0]);
            expect(payload).toContain('web');
            expect(payload).toContain('unhealthy');
        },
    );
});
