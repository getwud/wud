import React, { useState } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export function ConfigList({ children, sort = true }) {
  const childArray = React.Children.toArray(children);

  const sortedChildren = React.useMemo(() => {
    if (!sort) return childArray;

    return [...childArray].sort((a, b) => {
      // If element is not a React element with props, keep original order
      if (!React.isValidElement(a) || !React.isValidElement(b)) return 0;

      const aReq = Boolean(a.props && a.props.required);
      const bReq = Boolean(b.props && b.props.required);

      // Required first (true before false)
      if (aReq !== bReq) {
        return aReq ? -1 : 1;
      }

      // Alphabetical by name
      const aName = (a.props && a.props.name) || '';
      const bName = (b.props && b.props.name) || '';
      return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
    });
  }, [childArray, sort]);

  return <div className={styles.configList}>{sortedChildren}</div>;
}

export function ConfigOption({
  name,
  required,
  type,
  defaultValue,
  supported,
  children,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!name) return;
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.configCard}>
      <div className={styles.header}>
        <div className={styles.nameGroup}>
          <span className={styles.varName}>{name}</span>
          <button
            type="button"
            className={clsx(styles.copyButton, copied && styles.copied)}
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard' : 'Copy variable name'}
            aria-label="Copy variable name">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        <div className={styles.badgesGroup}>
          {required !== undefined && (
            <span
              className={clsx(
                styles.badge,
                required ? styles.badgeRequired : styles.badgeOptional
              )}>
              {required ? 'Required' : 'Optional'}
            </span>
          )}

          {type && (
            <span className={clsx(styles.badge, styles.badgeType)} title="Supported type">
              {type}
            </span>
          )}

          {defaultValue !== undefined && defaultValue !== '' && defaultValue !== null && (
            <span
              className={clsx(styles.badge, styles.badgeDefault)}
              title={`Default value: ${defaultValue}`}>
              default: {String(defaultValue)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {children}

        {supported && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Allowed values:</span>
            <span>{supported}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigOption;
