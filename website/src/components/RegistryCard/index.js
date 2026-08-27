import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './styles.module.css';

export function RegistryGrid({ children }) {
  return <div className={styles.registryGrid}>{children}</div>;
}

export function RegistryCard({
  title,
  href,
  defaultSupport = false,
  description,
}) {
  return (
    <Link to={href} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span
          className={clsx(
            styles.badge,
            defaultSupport ? styles.badgeDefault : styles.badgeSetup
          )}>
          {defaultSupport ? '⚡ Active by Default' : '🔐 Setup Required'}
        </span>
      </div>

      <p className={styles.description}>{description}</p>
    </Link>
  );
}

export default RegistryCard;
