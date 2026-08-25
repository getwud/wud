// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'README',
      label: 'Introduction',
    },
    {
      type: 'doc',
      id: 'quickstart/README',
      label: 'Quick start',
    },
    {
      type: 'category',
      label: 'Configuration',
      link: {
        type: 'doc',
        id: 'configuration/README',
      },
      items: [
        {
          type: 'category',
          label: 'Authentication',
          link: {
            type: 'doc',
            id: 'configuration/authentications/README',
          },
          items: [
            {
              type: 'doc',
              id: 'configuration/authentications/basic/README',
              label: 'Basic',
            },
            {
              type: 'doc',
              id: 'configuration/authentications/oidc/README',
              label: 'OpenID Connect',
            },
          ],
        },
        {
          type: 'doc',
          id: 'configuration/logs/README',
          label: 'Logs',
        },
        {
          type: 'category',
          label: 'Registries',
          link: {
            type: 'doc',
            id: 'configuration/registries/README',
          },
          items: [
            {
              type: 'doc',
              id: 'configuration/registries/acr/README',
              label: 'ACR',
            },
            {
              type: 'doc',
              id: 'configuration/registries/codeberg/README',
              label: 'CODEBERG',
            },
            {
              type: 'doc',
              id: 'configuration/registries/custom/README',
              label: 'CUSTOM',
            },
            {
              type: 'doc',
              id: 'configuration/registries/ecr/README',
              label: 'ECR',
            },
            {
              type: 'doc',
              id: 'configuration/registries/forgejo/README',
              label: 'FORGEJO',
            },
            {
              type: 'doc',
              id: 'configuration/registries/gcr/README',
              label: 'GCR',
            },
            {
              type: 'doc',
              id: 'configuration/registries/ghcr/README',
              label: 'GHCR',
            },
            {
              type: 'doc',
              id: 'configuration/registries/gitea/README',
              label: 'GITEA',
            },
            {
              type: 'doc',
              id: 'configuration/registries/gitlab/README',
              label: 'GITLAB',
            },
            {
              type: 'doc',
              id: 'configuration/registries/hub/README',
              label: 'HUB',
            },
            {
              type: 'doc',
              id: 'configuration/registries/lscr/README',
              label: 'LSCR',
            },
            {
              type: 'doc',
              id: 'configuration/registries/quay/README',
              label: 'QUAY',
            },
            {
              type: 'doc',
              id: 'configuration/registries/trueforge/README',
              label: 'TRUEFORGE',
            },
          ],
        },
        {
          type: 'doc',
          id: 'configuration/server/README',
          label: 'Server',
        },
        {
          type: 'doc',
          id: 'configuration/storage/README',
          label: 'Storage',
        },
        {
          type: 'doc',
          id: 'configuration/timezone/README',
          label: 'Timezone',
        },
        {
          type: 'category',
          label: 'Triggers',
          link: {
            type: 'doc',
            id: 'configuration/triggers/README',
          },
          items: [
            {
              type: 'doc',
              id: 'configuration/triggers/apprise/README',
              label: 'Apprise',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/command/README',
              label: 'Command',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/discord/README',
              label: 'Discord',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/docker/README',
              label: 'Docker',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/docker-compose/README',
              label: 'Docker Compose',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/gotify/README',
              label: 'Gotify',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/http/README',
              label: 'HTTP',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/ifttt/README',
              label: 'IFTTT',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/kafka/README',
              label: 'Kafka',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/mqtt/README',
              label: 'MQTT',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/nomad/README',
              label: 'Nomad',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/ntfy/README',
              label: 'Ntfy',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/pushover/README',
              label: 'Pushover',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/rocketchat/README',
              label: 'Rocket.Chat',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/slack/README',
              label: 'Slack',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/smtp/README',
              label: 'SMTP',
            },
            {
              type: 'doc',
              id: 'configuration/triggers/telegram/README',
              label: 'Telegram',
            },
          ],
        },
        {
          type: 'doc',
          id: 'configuration/watchers/README',
          label: 'Watchers',
        },
      ],
    },
    {
      type: 'category',
      label: 'API',
      link: {
        type: 'doc',
        id: 'api/README',
      },
      items: [
        {
          type: 'doc',
          id: 'api/app',
          label: 'Application',
        },
        {
          type: 'doc',
          id: 'api/container',
          label: 'Container',
        },
        {
          type: 'doc',
          id: 'api/log',
          label: 'Log',
        },
        {
          type: 'doc',
          id: 'api/registry',
          label: 'Registry',
        },
        {
          type: 'doc',
          id: 'api/store',
          label: 'Store',
        },
        {
          type: 'doc',
          id: 'api/trigger',
          label: 'Trigger',
        },
        {
          type: 'doc',
          id: 'api/watcher',
          label: 'Watcher',
        },
      ],
    },
    {
      type: 'doc',
      id: 'monitoring/README',
      label: 'Monitoring',
    },
    {
      type: 'doc',
      id: 'faq/README',
      label: 'FAQ',
    },
    {
      type: 'doc',
      id: 'changelog/README',
      label: 'Changelog',
    },
  ],
};

export default sidebars;
