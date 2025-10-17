import React from 'react';
import styles from './ContentGrid.module.css';

export default function ContentGrid({
                                      left, main, right,
                                      sidebarCollapsed = false,
                                      rightVisible = false,
                                    }: {
  left: React.ReactNode;
  main: React.ReactNode;          // 传入时请包在 <div className={styles.mainScroll}>...</div>
  right?: React.ReactNode;
  sidebarCollapsed?: boolean;
  rightVisible?: boolean;
}) {
  const vars: React.CSSProperties = {
    ['--sidebar-w' as any]: sidebarCollapsed ? '72px' : '250px',
    ['--right-w' as any]: rightVisible ? '320px' : '0px',
  };
  return (
    <div className={styles.root} style={vars}>
      <aside className={styles.left}>{left}</aside>
      <section className={styles.main}>{main}</section>
      <aside className={styles.right}>{rightVisible ? right : null}</aside>
    </div>
  );
}
