import React from 'react';
import styles from './TopBar.module.css';

export default function CreatorsWorkshopButton() {
  return (
    <button
      onClick={() => window.mainApi.creatorsWorkshopApi.show()}
      className={styles.iconBtn}
      title="打开 Creators Workshop"
    >
      <i className="fa-solid fa-sliders" />
    </button>
  );
}
