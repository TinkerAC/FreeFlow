import React from 'react';
import type { MusicWorkshopController } from '../hooks/useMusicWorkshopController';
import { PANELS } from '../workshopHelpers';
import styles from '../MusicWorkshop.module.css';

type PanelTabsProps = {
  controller: MusicWorkshopController;
};

export default function PanelTabs({ controller }: PanelTabsProps) {
  return (
    <div className={styles.panelTabs}>
      {PANELS.map((panel) => (
        <button
          key={panel.value}
          className={`${styles.panelTab} ${controller.activePanel === panel.value ? styles.panelTabActive : ''}`}
          onClick={() => {
            controller.setActivePanel(panel.value);
            controller.updateLocalRelease({ currentStage: panel.value });
          }}
        >
          {panel.label}
        </button>
      ))}
    </div>
  );
}
