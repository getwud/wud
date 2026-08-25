// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'WUD',
  tagline: "What's up Docker? Keep your containers up-to-date!",
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://getwud.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/wud/',

  // GitHub pages deployment config.
  organizationName: 'getwud',
  projectName: 'wud',

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/getwud/wud/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ['en'],
        docsRouteBasePath: '/docs',
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        highlightSearchTermsOnTargetPage: true,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'WUD',
        logo: {
          alt: 'WUD Logo',
          src: 'img/wud-logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/getwud/wud',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
            label: 'GitHub',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Introduction',
                to: '/docs',
              },
              {
                label: 'Quick Start',
                to: '/docs/quickstart',
              },
              {
                label: 'Configuration',
                to: '/docs/configuration',
              },
            ],
          },
          {
            title: 'Community & Support',
            items: [
              {
                label: 'GitHub Issues',
                href: 'https://github.com/getwud/wud/issues',
              },
              {
                label: 'GitHub Discussions',
                href: 'https://github.com/getwud/wud/discussions',
              },
              {
                label: 'Buy Me a Coffee',
                href: 'https://www.buymeacoffee.com/61rUNMm',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Docker Hub',
                href: 'https://hub.docker.com/r/getwud/wud',
              },
              {
                label: 'GitHub Repository',
                href: 'https://github.com/getwud/wud',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} WUD (What's up Docker?). Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: [
          'bash',
          'docker',
          'yaml',
          'json',
          'powershell',
          'ini',
          'promql',
          'diff',
          'markdown',
        ],
      },
    }),
};

export default config;

