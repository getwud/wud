import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './styles.module.css';

export function NavigationGrid({ children }) {
  return <div className={styles.navigationGrid}>{children}</div>;
}

export function NavigationCard({ icon, title, href, description }) {
  return (
    <Link to={href} className={styles.card}>
      <div className={styles.iconWrapper}>
        <i className={clsx('mdi', icon, styles.icon)} />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.arrow}>→</span>
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </Link>
  );
}

export default NavigationCard;
