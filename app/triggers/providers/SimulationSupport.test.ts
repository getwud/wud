import fs from 'fs';
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
import Xmpp from './xmpp/Xmpp';
import Zulip from './zulip/Zulip';

interface SimulationCapableTrigger {
    supportsSimulation(): boolean;
}

const SIMULATABLE: [string, new () => SimulationCapableTrigger][] = [
    ['amqp', Amqp],
    ['apprise', Apprise],
    ['bark', Bark],
    ['discord', Discord],
    ['githubactions', Githubactions],
    ['gitlabci', Gitlabci],
    ['gotify', Gotify],
    ['homeassistant', Homeassistant],
    ['http', Http],
    ['ifttt', Ifttt],
    ['kafka', Kafka],
    ['matrix', Matrix],
    ['mattermost', Mattermost],
    ['mock', Mock],
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
    ['xmpp', Xmpp],
    ['zulip', Zulip],
];

const NON_SIMULATABLE: [string, new () => SimulationCapableTrigger][] = [
    ['command', Command],
    ['docker', Docker],
    ['dockercompose', Dockercompose],
    ['nomad', Nomad],
];

describe('trigger simulation support matrix', () => {
    test('base Trigger defaults supportsSimulation() to true', () => {
        const base = new Trigger();
        expect(base.supportsSimulation()).toBe(true);
    });

    test('accounts for every provider directory under app/triggers/providers', () => {
        const providerDirs = fs
            .readdirSync(__dirname, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
        const covered = [
            ...SIMULATABLE.map(([name]) => name),
            ...NON_SIMULATABLE.map(([name]) => name),
        ].sort();
        expect(SIMULATABLE).toHaveLength(30);
        expect(NON_SIMULATABLE).toHaveLength(4);
        expect(covered).toEqual(providerDirs);
    });

    test.each(SIMULATABLE)(
        '%s supports test simulation',
        (_name, ProviderClass) => {
            const provider = new ProviderClass();
            expect(provider.supportsSimulation()).toBe(true);
        },
    );

    test.each(NON_SIMULATABLE)(
        '%s refuses test simulation',
        (_name, ProviderClass) => {
            const provider = new ProviderClass();
            expect(provider.supportsSimulation()).toBe(false);
        },
    );
});
