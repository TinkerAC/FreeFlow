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
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });

  const tabs = React.useMemo(() => [
    { label: '外观', value: 'appearance' as const },
    { label: '播放', value: 'playback' as const },
    { label: '应用', value: 'app' as const },
    { label: '用户', value: 'user' as const },
    { label: '服务', value: 'services' as const },
    { label: '音乐库', value: 'library' as const },
    { label: '网络', value: 'network' as const },
  ], []);

  React.useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) return;
      const activeIndex = tabs.findIndex(tab => tab.value === activeTab);
      const buttons = tabsRef.current.querySelectorAll('button');
      const activeButton = buttons[activeIndex];
      if (activeButton) {
        setIndicatorStyle({
          left: activeButton.offsetLeft,
          width: activeButton.offsetWidth,
        });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab, tabs]);

  const header = (
    <div style={{
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      borderBottom: '1px solid rgb(var(--md-sys-color-outline-variant))',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, flexShrink: 0 }}>设置</div>
      
      {/* Tab 滑块容器 */}
      <div
        ref={tabsRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: 'rgba(var(--md-sys-color-surface-variant), .35)',
          border: '1px solid rgb(var(--md-sys-color-outline-variant))',
        }}
      >
        {/* 滑动指示器 */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            height: 'calc(100% - 8px)',
            borderRadius: 999,
            background: 'rgb(var(--md-sys-color-primary))',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 0,
          }}
        />
        
        {/* Tab 按钮 */}
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: isActive 
                  ? 'rgb(var(--md-sys-color-on-primary))' 
                  : 'rgb(var(--md-sys-color-on-surface))',
                background: 'transparent',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginLeft: 'auto', opacity: .7, fontSize: 12, flexShrink: 0 }}>
        更改将自动保存并即时生效
      </div>
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
