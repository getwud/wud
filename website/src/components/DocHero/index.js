import React from 'react';
import clsx from 'clsx';
import * as simpleIcons from 'simple-icons';
import {
  AppriseIcon,
  GotifyIcon,
  SlackIcon,
  AwsIcon,
  AzureIcon,
  PushoverIcon,
  TrueForgeIcon,
} from './customIcons';
import styles from './styles.module.css';

// Custom icons mapping
const CUSTOM_ICONS = {
  apprise: AppriseIcon,
  gotify: GotifyIcon,
  slack: SlackIcon,
  ecr: AwsIcon,
  aws: AwsIcon,
  acr: AzureIcon,
  azure: AzureIcon,
  pushover: PushoverIcon,
  trueforge: TrueForgeIcon,
};

// Brand dictionary mapping directly to Simple Icons, MDI, or Custom SVG
const BRAND_MAPPING = {
  // Triggers
  apprise: { type: 'custom', Component: AppriseIcon },
  command: { type: 'mdi', icon: 'mdi-console-line', color: '#38bdf8' },
  discord: { type: 'simple', icon: simpleIcons.siDiscord },
  docker: { type: 'simple', icon: simpleIcons.siDocker },
  'docker-compose': { type: 'simple', icon: simpleIcons.siDocker },
  gotify: { type: 'custom', Component: GotifyIcon },
  http: { type: 'mdi', icon: 'mdi-webhook', color: '#0ea5e9' },
  ifttt: { type: 'simple', icon: simpleIcons.siIfttt },
  kafka: { type: 'simple', icon: simpleIcons.siApachekafka },
  mqtt: { type: 'simple', icon: simpleIcons.siMqtt },
  nomad: { type: 'simple', icon: simpleIcons.siNomad },
  ntfy: { type: 'simple', icon: simpleIcons.siNtfy },
  pushover: { type: 'custom', Component: PushoverIcon },
  rocketchat: { type: 'simple', icon: simpleIcons.siRocketdotchat },
  slack: { type: 'custom', Component: SlackIcon },
  smtp: { type: 'mdi', icon: 'mdi-email-fast-outline', color: '#f59e0b' },
  telegram: { type: 'simple', icon: simpleIcons.siTelegram },

  // Registries
  acr: { type: 'custom', Component: AzureIcon },
  azure: { type: 'custom', Component: AzureIcon },
  codeberg: { type: 'simple', icon: simpleIcons.siCodeberg },
  custom: { type: 'simple', icon: simpleIcons.siDocker },
  ecr: { type: 'custom', Component: AwsIcon },
  aws: { type: 'custom', Component: AwsIcon },
  forgejo: { type: 'simple', icon: simpleIcons.siForgejo },
  gcr: { type: 'simple', icon: simpleIcons.siGooglecloud },
  ghcr: { type: 'simple', icon: simpleIcons.siGithub },
  gitea: { type: 'simple', icon: simpleIcons.siGitea },
  gitlab: { type: 'simple', icon: simpleIcons.siGitlab },
  hub: { type: 'simple', icon: simpleIcons.siDocker },
  lscr: { type: 'simple', icon: simpleIcons.siLinuxserver },
  quay: { type: 'simple', icon: simpleIcons.siRedhat },
  trueforge: { type: 'custom', Component: TrueForgeIcon },

  // Auth & Monitoring
  basic: { type: 'mdi', icon: 'mdi-lock-outline', color: '#eab308' },
  oidc: { type: 'simple', icon: simpleIcons.siOpenid },
  auth0: { type: 'simple', icon: simpleIcons.siAuth0 },
  authelia: { type: 'simple', icon: simpleIcons.siAuthelia },
  authentik: { type: 'simple', icon: simpleIcons.siAuthentik },
  grafana: { type: 'simple', icon: simpleIcons.siGrafana },
  prometheus: { type: 'simple', icon: simpleIcons.siPrometheus },
};

export function BrandIcon({ name, size = 36, className }) {
  if (!name) return null;

  // Direct MDI string
  if (name.startsWith('mdi-') || name.startsWith('mdi ')) {
    return (
      <i
        className={clsx('mdi', name, className)}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
      />
    );
  }

  const brandKey = name.toLowerCase();
  const brand = BRAND_MAPPING[brandKey];

  if (brand?.type === 'custom' && brand.Component) {
    const Component = brand.Component;
    return <Component size={size} className={className} />;
  }

  if (brand?.type === 'mdi') {
    return (
      <i
        className={clsx('mdi', brand.icon, className)}
        style={{ fontSize: `${size}px`, lineHeight: 1, color: brand.color }}
      />
    );
  }

  if (brand?.type === 'simple' && brand.icon) {
    return (
      <svg
        role="img"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={clsx(styles.simpleIconSvg, className)}
        style={{ fill: `#${brand.icon.hex}` }}>
        <path d={brand.icon.path} />
      </svg>
    );
  }

  // Fallback generic icon
  return (
    <i
      className={clsx('mdi mdi-cube-outline', className)}
      style={{ fontSize: `${size}px` }}
    />
  );
}

export function DocHero({
  icon,
  title,
  description,
  badge,
  badgeType = 'default',
  children,
}) {
  return (
    <div className={styles.heroContainer}>
      <div className={styles.heroHeader}>
        <div className={styles.iconBox}>
          <BrandIcon name={icon} size={34} />
        </div>
        <div className={styles.headerInfo}>
          {badge && (
            <span
              className={clsx(
                styles.badge,
                badgeType === 'default'
                  ? styles.badgeDefault
                  : badgeType === 'setup'
                  ? styles.badgeSetup
                  : styles.badgeInfo
              )}>
              {badge}
            </span>
          )}
        </div>
      </div>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </div>
  );
}

export default DocHero;
