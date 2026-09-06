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
        <iframe
          src={demoUrl}
          title="WUD Interactive Simulator"
          className={styles.demoFrame}
          loading="eager"
        />
      </main>
    </Layout>
  );
}
