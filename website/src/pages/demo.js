import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './demo.module.css';

export default function Demo() {
  const demoUrl = useBaseUrl('/demo-app/index.html');

  return (
    <Layout
      title="Live Demo Simulator"
      description="Interactive preview of What's Up Docker (WUD) UI with simulated homelab containers."
      noFooter
    >
      <main className={styles.demoContainer}>
        <div className={styles.demoHeader}>
          <div className={styles.demoInfo}>
            <h1 className={styles.demoTitle}>🎮 WUD UI Simulator</h1>
            <span className={styles.demoBadge}>
              ● Interactive Homelab Mock
            </span>
          </div>
          <div className={styles.demoActions}>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openButton}
              title="Open the simulator in a dedicated full-screen tab"
            >
              Open Full Screen ↗
            </a>
          </div>
        </div>

        <div className={styles.frameWrapper}>
          <iframe
            src={demoUrl}
            title="WUD Interactive Simulator"
            className={styles.demoFrame}
            loading="eager"
          />
        </div>
      </main>
    </Layout>
  );
}
