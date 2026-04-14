import React from 'react';
import {
  type WorkshopSection,
  WORKSHOP_NAV_ITEMS,
} from '../workshopHelpers';
import styles from '../MusicWorkshop.module.css';

type WorkshopSidebarProps = {
  activeSection: WorkshopSection;
  onSelectSection: (section: WorkshopSection) => void;
};

export default function WorkshopSidebar({
  activeSection,
  onSelectSection,
}: WorkshopSidebarProps) {
  return (
    <aside className={styles.sideNav}>
      <section className={styles.sideSection}>
        <div className={styles.sideSectionTitle}>工作台</div>
        <div className={styles.navList}>
          {WORKSHOP_NAV_ITEMS.map((item) => {
            return (
              <button
                key={item.value}
                className={`${styles.navButton} ${activeSection === item.value ? styles.navButtonActive : ''}`}
                onClick={() => onSelectSection(item.value)}
              >
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navHint}>{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
