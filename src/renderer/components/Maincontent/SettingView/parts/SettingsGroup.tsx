import React from 'react';
import styles from '../Settings.module.css';

export default function SettingsGroup({
                                        title, desc, children,
                                      }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <div className={styles.groupTitle}>{title}</div>
        {desc && <div className={styles.groupDesc}>{desc}</div>}
      </div>
      {children}
    </section>
  );
}