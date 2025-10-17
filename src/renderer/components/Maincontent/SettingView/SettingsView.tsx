import React from 'react';
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';
import styles from './Settings.module.css';
import Segmented from './controls/Segmented';

// Tab 组件
import AppearanceSettingsTab from './tabs/AppearanceSettingsTab';
import PlaybackSettingsTab from './tabs/PlaybackSettingsTab';
import ApplicationSettingsTab from './tabs/ApplicationSettingsTab';
import UserSettingsTab from './tabs/UserSettingsTab';
import ServicesSettingsTab from './tabs/ServicesSettingsTab';
import LibrarySettingsTab from './tabs/LibrarySettingsTab';
import NetworkSettingsTab from './tabs/NetworkSettingsTab';

type SettingsTab = 'appearance' | 'playback' | 'app' | 'user' | 'services' | 'library' | 'network';

export default function SettingsView() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('appearance');

  const header = (
    <div style={{
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      borderBottom: '1px solid rgb(var(--md-sys-color-outline-variant))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>设置</div>
        <div style={{ marginLeft: 'auto', opacity: .7, fontSize: 12 }}>更改将自动保存并即时生效</div>
      </div>
      <Segmented<SettingsTab>
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { label: '外观', value: 'appearance' },
          { label: '播放', value: 'playback' },
          { label: '应用', value: 'app' },
          { label: '用户', value: 'user' },
          { label: '服务', value: 'services' },
          { label: '音乐库', value: 'library' },
          { label: '网络', value: 'network' },
        ]}
      />
    </div>
  );

  return (
    <ViewShell header={header} padded hideScrollbar>
      <div className={styles.root}>
        {activeTab === 'appearance' && <AppearanceSettingsTab />}
        {activeTab === 'playback' && <PlaybackSettingsTab />}
        {activeTab === 'app' && <ApplicationSettingsTab />}
        {activeTab === 'user' && <UserSettingsTab />}
        {activeTab === 'services' && <ServicesSettingsTab />}
        {activeTab === 'library' && <LibrarySettingsTab />}
        {activeTab === 'network' && <NetworkSettingsTab />}
      </div>
    </ViewShell>
  );
}
