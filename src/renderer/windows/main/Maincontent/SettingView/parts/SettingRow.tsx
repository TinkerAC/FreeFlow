import React from 'react';
import styles from '../Settings.module.css';

export default function SettingRow({
                                     label, sub, control,
                                   }: { label: string; sub?: string; control: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.labelWrap}>
        <div className={styles.label}>{label}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
      <div className={styles.controlWrap}>{control}</div>
    </div>
  );
}