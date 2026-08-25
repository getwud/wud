import React, { useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const FEATURES = [
  {
    icon: '🐳',
    title: 'Multi-Watcher Engine',
    description:
      'Monitor local Docker sockets, remote Docker daemons over TLS, Docker Compose stacks, Kubernetes, or Nomad orchestrators seamlessly.',
    tags: ['Docker', 'Compose', 'Kubernetes', 'Nomad'],
  },
  {
    icon: '🌐',
    title: 'Universal Registry Support',
    description:
      'Native authentication and tag inspection for Docker Hub, GHCR, Quay, AWS ECR, GCP GCR/GAR, Azure ACR, Gitlab, Gitea, and custom self-hosted registries.',
    tags: ['Docker Hub', 'GHCR', 'ECR', 'ACR', 'Self-Hosted'],
  },
  {
    icon: '🔔',
    title: '15+ Alert Triggers',
    description:
      'Get notified the second updates drop via Discord, Telegram, Slack, Gotify, Ntfy, Pushover, Apprise, Webhooks, MQTT, Kafka, or SMTP email.',
    tags: ['Discord', 'Telegram', 'Slack', 'Webhooks', 'Ntfy'],
  },
  {
    icon: '🎯',
    title: 'Semver & Regex Filtering',
    description:
      'Flexible tag selection rules with semantic versioning (major/minor/patch constraints), regular expressions, and include/exclude patterns.',
    tags: ['Semver', 'Regex', 'Prereleases', 'Pinning'],
  },
  {
    icon: '⚡',
    title: 'Automated Updates',
    description:
      'Optionally trigger automatic container recreation or run custom automation scripts whenever a validated image update is available.',
    tags: ['Auto-Update', 'Scripts', 'Zero-Downtime'],
  },
  {
    icon: '📊',
    title: 'Modern UI & Prometheus Metrics',
    description:
      'A sleek real-time web dashboard for manual triggers and status monitoring, alongside Prometheus metrics ready for Grafana visualization.',
    tags: ['Web UI', 'Prometheus', 'Grafana', 'REST API'],
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
    <header className={styles.heroContainer}>
      <div className={styles.glowBlob1} />
      <div className={styles.glowBlob2} />

      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.pillBadge}>
            <span>🚀</span>
            <span>WUD • What&apos;s up Docker?</span>
          </div>

          <Heading as="h1" className={styles.heroTitle}>
            Keep your containers <br />
            <span className={styles.gradientText}>always up-to-date</span>
          </Heading>

          <p className={styles.heroSubtitle}>
            WUD inspects your running containers, finds new image versions across any registry,
            and alerts or triggers updates through your favorite channels.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryBtn} to="/docs/quickstart">
              <span>Get Started</span>
              <span>→</span>
            </Link>
            <Link className={styles.secondaryBtn} to="/docs">
              <span>Explore Documentation</span>
            </Link>
            <a
              className={styles.secondaryBtn}
              href="https://github.com/getwud/wud"
              target="_blank"
              rel="noopener noreferrer">
              <span>★ Star on GitHub</span>
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
      </div>
    </header>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Powerful Features</div>
          <Heading as="h2" className={styles.sectionTitle}>
            Engineered for reliability & flexibility
          </Heading>
          <p className={styles.sectionSubtitle}>
            Everything you need to automate container lifecycle monitoring without lock-in or external dependencies.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.iconWrapper}>{feature.icon}</div>
              <Heading as="h3" className={styles.featureCardTitle}>
                {feature.title}
              </Heading>
              <p className={styles.featureCardDesc}>{feature.description}</p>
              <div className={styles.featureTags}>
                {feature.tags.map((tag, tIdx) => (
                  <span key={tIdx} className={styles.featureTag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.ctaBanner}>
          <Heading as="h3" className={styles.ctaTitle}>
            Ready to upgrade your Docker workflow?
          </Heading>
          <p className={styles.ctaText}>
            Get up and running in less than 2 minutes. Free, open source, and privacy-first.
          </p>
          <Link className={styles.primaryBtn} to="/docs/quickstart">
            Start Monitoring Now →
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

