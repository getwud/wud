import React, { useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const FEATURES = [
  {
    icon: 'mdi-update',
    title: 'Multi-Watcher Engine',
    description:
      'Monitor local Docker daemons, remote Docker engines over TLS, Docker Compose setups, Kubernetes, or Nomad orchestrators seamlessly.',
  },
  {
    icon: 'mdi-database-search',
    title: 'Universal Registry Support',
    description:
      'Native authentication and automated tag inspection for Docker Hub, GHCR, AWS ECR, GCP GCR/GAR, Azure ACR, Quay, GitLab, Gitea, and self-hosted registries.',
  },
  {
    icon: 'mdi-bell-ring',
    title: '15+ Triggers',
    description:
      'Receive instant update notifications or execute actions via Discord, Telegram, Slack, Gotify, Ntfy, Pushover, Apprise, Webhooks, MQTT, Kafka, or SMTP email.',
  },
  {
    icon: 'mdi-filter-variant',
    title: 'Semver & Regex Filtering',
    description:
      'Fine-tune version targeting with semantic versioning constraints (major/minor/patch), regular expressions, and include/exclude patterns.',
  },
  {
    icon: 'mdi-sync',
    title: 'Automated Updates',
    description:
      'Trigger automatic container recreation or run custom automation scripts whenever a newer image version is detected and validated.',
  },
  {
    icon: 'mdi-view-dashboard-outline',
    title: 'Web UI & REST API',
    description:
      'A sleek real-time web dashboard for manual triggers and container monitoring, plus Prometheus metrics ready for Grafana dashboards.',
  },
];

function HeroBanner() {
  const [copied, setCopied] = useState(false);
  const command = 'docker run -d --name wud -v /var/run/docker.sock:/var/run/docker.sock -p 3000:3000 getwud/wud';

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className={styles.heroBanner}>
      <div className="container">
        {/* Real WUD Mascot Logo Showcase */}
        <div className={styles.heroLogoContainer}>
          <div className={styles.heroLogoGlow} />
          <img
            src={useBaseUrl('/img/wud-logo.svg')}
            alt="WUD Logo"
            className={styles.heroLogo}
          />
        </div>

        <Heading as="h1" className={styles.heroTitle}>
          What&apos;s up Docker?
        </Heading>

        <p className={styles.tagline}>
          Keep your containers up-to-date!
        </p>

        <p className={styles.heroDescription}>
          WUD is a lightweight, open-source tool that continuously monitors your containers,
          discovers image updates across all registries, and notifies you or triggers updates automatically.
        </p>

        <div className={styles.buttonsContainer}>
          <Link className={styles.btnPrimary} to="/docs/quickstart">
            Get Started →
          </Link>
          <Link className={styles.btnSecondary} to="/docs">
            Documentation
          </Link>
          <a
            className={styles.btnSecondary}
            href="https://github.com/getwud/wud"
            target="_blank"
            rel="noopener noreferrer">
            ★ Star on GitHub
          </a>
        </div>

        {/* Quick Start Terminal Widget */}
        <div className={styles.terminalCard}>
          <div className={styles.terminalHeader}>
            <div className={styles.terminalDots}>
              <span className={clsx(styles.dot, styles.dotRed)} />
              <span className={clsx(styles.dot, styles.dotYellow)} />
              <span className={clsx(styles.dot, styles.dotGreen)} />
            </div>
            <span className={styles.terminalTitle}>Quick Run</span>
          </div>
          <div className={styles.terminalBody}>
            <div>
              <span className={styles.terminalPrompt}>$</span>
              <span className={styles.terminalCode}>{command}</span>
            </div>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopy}
              title="Copy to clipboard">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Everything you need for container updates
          </Heading>
          <p className={styles.sectionSubtitle}>
            Built from the ground up for reliability, flexibility, and privacy.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <i className={clsx('mdi', feature.icon, styles.featureMdiIcon)} aria-hidden="true" />
              </div>
              <Heading as="h3" className={styles.featureTitle}>
                {feature.title}
              </Heading>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaContainer}>
          <Heading as="h3" className={styles.ctaTitle}>
            Ready to get started?
          </Heading>
          <p className={styles.ctaSubtitle}>
            Set up WUD in less than 2 minutes and keep your Docker environment effortlessly updated.
          </p>
          <Link className={styles.btnPrimary} to="/docs/quickstart">
            Quick Start Guide →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - What's up Docker?`}
      description="WUD - Keep your containers up-to-date with automated watcher and trigger integrations.">
      <HeroBanner />
      <main>
        <FeaturesSection />
      </main>
    </Layout>
  );
}
