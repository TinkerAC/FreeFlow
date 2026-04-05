import React from 'react';
import styles from './AppFrame.module.css';

export default function AppFrame({
                                   top, content, bottom,
                                 }: { top: React.ReactNode; content: React.ReactNode; bottom: React.ReactNode; }) {
  return (
    <div className={styles.root}>
      <header className={styles.top}>{top}</header>
      <main className={styles.content}>{content}</main>
      <footer className={styles.bottom}>{bottom}</footer>
    </div>
  );
}
