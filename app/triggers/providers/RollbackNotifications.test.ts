// Coverage matrix for the rollback-notification contract (blueprint §9.2 / §9.5).
// Single source of truth: a notification trigger must opt in via
// `supportsRollbackNotifications() === true` and expose a real `triggerRollback`;
// the remaining providers keep the base `false` / no-op for a named reason.
import Trigger from './Trigger';

import Amqp from './amqp/Amqp';
import Apprise from './apprise/Apprise';
import Bark from './bark/Bark';
import Command from './command/Command';
import Discord from './discord/Discord';
import Docker from './docker/Docker';
import Dockercompose from './dockercompose/Dockercompose';
import Githubactions from './githubactions/Githubactions';
import Gitlabci from './gitlabci/Gitlabci';
import Gotify from './gotify/Gotify';
import Homeassistant from './homeassistant/Homeassistant';
import Http from './http/Http';
import Ifttt from './ifttt/Ifttt';
import Kafka from './kafka/Kafka';
import Matrix from './matrix/Matrix';
import Mattermost from './mattermost/Mattermost';
import Mock from './mock/Mock';
import Mqtt from './mqtt/Mqtt';
import Nats from './nats/Nats';
import Nomad from './nomad/Nomad';
import Ntfy from './ntfy/Ntfy';
import Opsgenie from './opsgenie/Opsgenie';
import Pagerduty from './pagerduty/Pagerduty';
import Prowl from './prowl/Prowl';
import Pushover from './pushover/Pushover';
import Rocketchat from './rocketchat/Rocketchat';
import Signal from './signal/Signal';
import Slack from './slack/Slack';
import Smtp from './smtp/Smtp';
import Telegram from './telegram/Telegram';
import Uptimekuma from './uptimekuma/Uptimekuma';
import Whatsapp from './whatsapp/Whatsapp';
import Zulip from './zulip/Zulip';

const NOTIFIERS: [string, any][] = [
    ['amqp', Amqp],
    ['apprise', Apprise],
    ['bark', Bark],
    ['discord', Discord],
    ['gotify', Gotify],
    ['homeassistant', Homeassistant],
    ['http', Http],
    ['ifttt', Ifttt],
    ['kafka', Kafka],
    ['matrix', Matrix],
    ['mattermost', Mattermost],
    ['mqtt', Mqtt],
    ['nats', Nats],
    ['ntfy', Ntfy],
    ['opsgenie', Opsgenie],
    ['pagerduty', Pagerduty],
    ['prowl', Prowl],
    ['pushover', Pushover],
    ['rocketchat', Rocketchat],
    ['signal', Signal],
    ['slack', Slack],
    ['smtp', Smtp],
    ['telegram', Telegram],
    ['uptimekuma', Uptimekuma],
    ['whatsapp', Whatsapp],
    ['zulip', Zulip],
];

const EXCLUDED: [string, any][] = [
    ['command', Command],
    ['docker', Docker],
    ['dockercompose', Dockercompose],
    ['githubactions', Githubactions],
    ['gitlabci', Gitlabci],
    ['mock', Mock],
    ['nomad', Nomad],
];

describe('rollback notification coverage matrix (§9.2)', () => {
    test('declares exactly the 26 notification triggers as supporting rollback', () => {
        expect(NOTIFIERS).toHaveLength(26);
        expect(EXCLUDED).toHaveLength(7);
    });

    test.each(NOTIFIERS)(
        '%s supports rollback notifications and overrides triggerRollback',
        (_name, ProviderClass) => {
            const provider = new ProviderClass();
            expect(provider.supportsRollbackNotifications()).toBe(true);
            expect(ProviderClass.prototype.triggerRollback).not.toBe(
                Trigger.prototype.triggerRollback,
            );
        },
    );

    test.each(EXCLUDED)(
        '%s does not support rollback notifications and keeps the base no-op',
        (_name, ProviderClass) => {
            const provider = new ProviderClass();
            expect(provider.supportsRollbackNotifications()).toBe(false);
            expect(ProviderClass.prototype.triggerRollback).toBe(
                Trigger.prototype.triggerRollback,
            );
        },
    );
});
