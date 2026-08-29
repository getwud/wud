// @ts-check

/**
 * Multi-Sidebar configuration for WUD documentation.
 * Each top-level navbar section has its own focused, dedicated sidebar.
 *
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
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
      label: 'Quick Start',
    },
    {
      type: 'doc',
      id: 'configuration/README',
      label: 'Configuration Hub',
    },
    {
      type: 'doc',
      id: 'faq/README',
      label: 'FAQ',
    },
    {
      type: 'category',
      label: 'Changelog',
      link: {
        type: 'doc',
        id: 'changelog/README',
      },
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'changelog/next',
          label: 'Next (Unreleased)',
        },
        {
          type: 'doc',
          id: 'changelog/v8',
          label: 'v8.x (Current)',
        },
        {
          type: 'doc',
          id: 'changelog/v7',
          label: 'v7.x',
        },
        {
          type: 'doc',
          id: 'changelog/v6',
          label: 'v6.x',
        },
        {
          type: 'doc',
          id: 'changelog/v5',
          label: 'v5.x',
        },
        {
          type: 'doc',
          id: 'changelog/legacy',
          label: 'v1.x – v4.x',
        },
      ],
    },
  ],

  adminSidebar: [
    {
      type: 'category',
      label: 'Administration',
      collapsed: false,
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
              label: 'Basic Auth',
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
          id: 'configuration/logs/README',
          label: 'Logging',
        },
        {
          type: 'doc',
          id: 'configuration/timezone/README',
          label: 'Timezone',
        },
        {
          type: 'doc',
          id: 'monitoring/README',
          label: 'Monitoring',
        },
      ],
    },
  ],

  watchersSidebar: [
    {
      type: 'doc',
      id: 'configuration/watchers/README',
      label: 'Docker Watcher',
    },
    {
      type: 'doc',
      id: 'configuration/watchers/labels',
      label: 'Container Labels',
    },
    {
      type: 'doc',
      id: 'configuration/watchers/remote-tls',
      label: 'Remote Daemons & TLS',
    },
    {
      type: 'doc',
      id: 'configuration/watchers/digest-rate-limits',
      label: 'Digest & Rate Limits',
    },
  ],

  registriesSidebar: [
    {
      type: 'doc',
      id: 'configuration/registries/README',
      label: 'Overview & Zero-Config',
    },
    {
      type: 'category',
      label: 'Supported Registries',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'configuration/registries/alibaba/README',
          label: 'Alibaba Cloud (ACR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/ecr/README',
          label: 'AWS ECR',
        },
        {
          type: 'doc',
          id: 'configuration/registries/acr/README',
          label: 'Azure Container Registry (ACR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/codeberg/README',
          label: 'Codeberg',
        },
        {
          type: 'doc',
          id: 'configuration/registries/custom/README',
          label: 'Custom / Self-Hosted',
        },
        {
          type: 'doc',
          id: 'configuration/registries/docr/README',
          label: 'DigitalOcean (DOCR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/hub/README',
          label: 'Docker Hub',
        },
        {
          type: 'doc',
          id: 'configuration/registries/forgejo/README',
          label: 'Forgejo',
        },
        {
          type: 'doc',
          id: 'configuration/registries/gitea/README',
          label: 'Gitea',
        },
        {
          type: 'doc',
          id: 'configuration/registries/ghcr/README',
          label: 'GitHub Container Registry (GHCR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/gitlab/README',
          label: 'GitLab',
        },
        {
          type: 'doc',
          id: 'configuration/registries/gcr/README',
          label: 'Google Container Registry (GCR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/harbor/README',
          label: 'Harbor',
        },
        {
          type: 'doc',
          id: 'configuration/registries/icr/README',
          label: 'IBM Cloud (ICR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/proget/README',
          label: 'Inedo ProGet',
        },
        {
          type: 'doc',
          id: 'configuration/registries/jfrog/README',
          label: 'JFrog Artifactory',
        },
        {
          type: 'doc',
          id: 'configuration/registries/linode/README',
          label: 'Linode (Akamai)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/lscr/README',
          label: 'LinuxServer (LSCR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/ocir/README',
          label: 'Oracle Cloud (OCIR)',
        },
        {
          type: 'doc',
          id: 'configuration/registries/quay/README',
          label: 'Quay',
        },
        {
          type: 'doc',
          id: 'configuration/registries/scaleway/README',
          label: 'Scaleway',
        },
        {
          type: 'doc',
          id: 'configuration/registries/nexus/README',
          label: 'Sonatype Nexus',
        },
        {
          type: 'doc',
          id: 'configuration/registries/trueforge/README',
          label: 'TrueForge',
        },
      ],
    },
  ],

  triggersSidebar: [
    {
      type: 'doc',
      id: 'configuration/triggers/README',
      label: 'Overview & Common Options',
    },
    {
      type: 'category',
      label: 'Auto-Update & Orchestration',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'configuration/triggers/docker/README',
          label: 'Docker Container',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/docker-compose/README',
          label: 'Docker Compose',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/nomad/README',
          label: 'HashiCorp Nomad',
        },
      ],
    },
    {
      type: 'category',
      label: 'Notifications & Chat',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'configuration/triggers/apprise/README',
          label: 'Apprise',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/discord/README',
          label: 'Discord',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/gotify/README',
          label: 'Gotify',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/ifttt/README',
          label: 'IFTTT',
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
          label: 'SMTP Email',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/telegram/README',
          label: 'Telegram',
        },
      ],
    },
    {
      type: 'category',
      label: 'Webhooks & Queues',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'configuration/triggers/kafka/README',
          label: 'Apache Kafka',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/http/README',
          label: 'HTTP Webhooks',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/mqtt/README',
          label: 'MQTT (Home Assistant)',
        },
        {
          type: 'doc',
          id: 'configuration/triggers/command/README',
          label: 'Shell Command Scripts',
        },
      ],
    },
  ],

  apiSidebar: [
    {
      type: 'doc',
      id: 'api/README',
      label: 'Overview',
    },
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
};

export default sidebars;
