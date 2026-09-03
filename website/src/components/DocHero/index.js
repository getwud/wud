import React from 'react';
import clsx from 'clsx';
import { Icon, addCollection } from '@iconify/react';
import logosIcons from '@iconify-json/logos/icons.json';
import selfhstIcons from '@iconify-json/selfhst/icons.json';
import simpleIcons from '@iconify-json/simple-icons/icons.json';
import mdiIcons from '@iconify-json/mdi/icons.json';
import styles from './styles.module.css';

// Register icon collections for fast, offline SSR rendering
addCollection(logosIcons);
addCollection(selfhstIcons);
addCollection(simpleIcons);
addCollection(mdiIcons);

const BRAND_CONFIG = {
  // Triggers
  apprise: { icon: 'selfhst:apprise' },
  command: { icon: 'mdi:console-line', color: '#0284c7' },
  discord: { icon: 'logos:discord-icon' },
  docker: { icon: 'logos:docker-icon' },
  'docker-compose': { icon: 'logos:docker-icon' },
  gotify: { icon: 'selfhst:gotify' },
  http: { icon: 'mdi:webhook', color: '#0284c7' },
  ifttt: { icon: 'simple-icons:ifttt', color: '#000000' },
  kafka: { icon: 'logos:kafka-icon' },
  mqtt: { icon: 'selfhst:mqtt' },
  nomad: { icon: 'logos:nomad-icon' },
  ntfy: { icon: 'selfhst:ntfy' },
  pushover: { icon: 'selfhst:pushover' },
  rocketchat: { icon: 'simple-icons:rocketdotchat', color: '#F5455C' },
  slack: { icon: 'logos:slack-icon' },
  smtp: { icon: 'mdi:email-fast-outline', color: '#f59e0b' },
  telegram: { icon: 'logos:telegram' },

  // Registries
  acr: { icon: 'logos:azure-icon' },
  azure: { icon: 'logos:azure-icon' },
  codeberg: { icon: 'selfhst:codeberg' },
  custom: { icon: 'logos:docker-icon' },
  ecr: { icon: 'logos:aws' },
  aws: { icon: 'logos:aws' },
  forgejo: { icon: 'selfhst:forgejo' },
  gcr: { icon: 'logos:google-cloud' },
  ghcr: { icon: 'logos:github-icon' },
  gitea: { icon: 'selfhst:gitea' },
  gitlab: { icon: 'logos:gitlab' },
  hub: { icon: 'logos:docker-icon' },
  lscr: { icon: 'selfhst:linuxserver-io' },
  quay: { icon: 'logos:quay' },
  trueforge: { icon: 'mdi:cube-outline', color: '#38bdf8' },
  alibaba: { icon: 'simple-icons:alibabacloud', color: '#ff6a00' },
  docr: { icon: 'logos:digital-ocean' },
  digitalocean: { icon: 'logos:digital-ocean' },
  harbor: { icon: 'simple-icons:harbor', color: '#60B932' },
  icr: { icon: 'logos:ibm' },
  ibm: { icon: 'logos:ibm' },
  jfrog: { icon: 'logos:jfrog' },
  linode: { icon: 'logos:linode' },
  nexus: { icon: 'simple-icons:sonatype', color: '#243744' },
  ocir: { icon: 'logos:oracle' },
  oracle: { icon: 'logos:oracle' },
  proget: { icon: 'mdi:package-variant-closed', color: '#0284c7' },
  scaleway: { icon: 'simple-icons:scaleway', color: '#4f0599' },

  // Auth & Monitoring
  basic: { icon: 'mdi:lock-outline', color: '#eab308' },
  oidc: { icon: 'simple-icons:openid', color: '#F78C40' },
  auth0: { icon: 'logos:auth0-icon' },
  authelia: { icon: 'selfhst:authelia' },
  authentik: { icon: 'selfhst:authentik' },
  keycloak: { icon: 'selfhst:keycloak' },
  okta: { icon: 'logos:okta-icon' },
  grafana: { icon: 'logos:grafana' },
  prometheus: { icon: 'logos:prometheus' },
};

export function BrandIcon({ name, size = 36, className }) {
  if (!name) return null;

  const iconName = name.toLowerCase();
  const brand = BRAND_CONFIG[iconName] || {};

  let iconRef = brand.icon;
  let iconColor = brand.color;

  if (!iconRef) {
    if (iconName.startsWith('hl-') || iconName.startsWith('hl:')) {
      iconRef = `selfhst:${iconName.replace(/^hl[:-]/, '')}`;
    } else if (iconName.startsWith('sh-') || iconName.startsWith('sh:')) {
      iconRef = `selfhst:${iconName.replace(/^sh[:-]/, '')}`;
    } else if (iconName.startsWith('si-') || iconName.startsWith('si:')) {
      iconRef = `simple-icons:${iconName.replace(/^si[:-]/, '')}`;
    } else if (iconName.startsWith('mdi-') || iconName.startsWith('mdi ') || iconName.startsWith('mdi:')) {
      iconRef = `mdi:${iconName.replace(/^mdi[- :]/, '')}`;
    } else if (iconName.startsWith('fa-') || iconName.startsWith('fa ') || iconName.startsWith('fa:')) {
      iconRef = `fa6-solid:${iconName.replace(/^fa[- :]/, '')}`;
    } else if (iconName.startsWith('fab-') || iconName.startsWith('fab:')) {
      iconRef = `fa6-brands:${iconName.replace(/^fab[:-]/, '')}`;
    } else if (iconName.startsWith('far-') || iconName.startsWith('far:')) {
      iconRef = `fa6-regular:${iconName.replace(/^far[:-]/, '')}`;
    } else if (iconName.startsWith('fas-') || iconName.startsWith('fas:')) {
      iconRef = `fa6-solid:${iconName.replace(/^fas[:-]/, '')}`;
    } else if (iconName.includes(':')) {
      iconRef = iconName;
    } else {
      iconRef = `simple-icons:${iconName}`;
    }
  }

  return (
    <Icon
      icon={iconRef}
      width={size}
      height={size}
      style={iconColor ? { color: iconColor } : undefined}
      className={clsx(styles.brandIcon, className)}
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
