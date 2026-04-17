import React from 'react';
import styles from './TabNav.module.css';

export type TabKey = 'tracks' | 'playlists';
const labels: Record<TabKey, string> = {
  tracks: '歌曲',
  playlists: '歌单',
};

export default function TabNav({
                                 activeTab, onTabChange,
                               }: { activeTab: TabKey; onTabChange: (key: TabKey) => void; }) {
  return (
    <div className={styles.root}>
      {Object.entries(labels).map(([k, label]) => {
        const key = k as TabKey;
        const active = key === activeTab;
        return (
          <button
            key={key}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
