import React, { useState } from 'react';
import {
  SettingCheckboxGroupRow,
  SettingDropdownRow,
  SettingSection,
} from '@components/PreferenceWindow/prefComp/settingUI';
import { AppIcon } from '@src/shared/hifiniCookies';
import { systemContext } from '@main/core/electronContextApi';

/**
 * PreferenceWindow – JetBrains-style settings panel for FreeFlow.
 * 所有状态仅 mock，在保存时打印到控制台，方便后续接入 IPC。
 */
const PreferenceWindow: React.FC = () => {
  /* ------------------------------- state ------------------------------- */
  const [theme, setTheme] = useState('system');
  const [audioQuality, setAudioQuality] = useState('high');
  const [features, setFeatures] = useState<string[]>(['lyrics']);
  const [appIcon, setAppIcon] = useState<AppIcon>(AppIcon.Default);

  /* ------------------------------ actions ------------------------------ */
  const handleSave = () => {
    // TODO: 调用 IPC 将偏好写入主进程 / Store
    console.table({ theme, audioQuality, features });
    // 关闭窗口：如果在独立 BrowserWindow 中，可直接 window.close()
    window.close();
  };

  /* ------------------------------- render ------------------------------ */
  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e] p-6 text-white">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Preferences(你说的对,但是这个界面没有任何用处)</h1>
        <button
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Save & Close
        </button>
      </header>

      {/* General Section */}
      <SettingSection title="General">
        <SettingDropdownRow
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
        />

        <SettingDropdownRow
          label="AppIcon"
          value={appIcon}                     // 当前枚举值
          onChange={(val) => {                // ⬅ 接收新值
            setAppIcon(val as AppIcon);       // 更新本地 state
            systemContext.setAppIcon(val as AppIcon); // 调用主进程
          }}
          options={[
            { label: 'Default',   value: AppIcon.Default },
            { label: 'JetBrains', value: AppIcon.JetBrains },
          ]}
        />

        <SettingCheckboxGroupRow
          label="Features"
          values={features}
          onChange={setFeatures}
          options={[
            { label: 'Lyrics panel', value: 'lyrics' },
            { label: 'Notifications', value: 'notify' },
            { label: 'Last.fm scrobble', value: 'scrobble' },
          ]}
        />
      </SettingSection>

      {/* Playback Section */}
      <SettingSection title="Playback">
        <SettingDropdownRow
          label="Audio quality"
          value={audioQuality}
          onChange={setAudioQuality}
          options={[
            { label: 'Low (96 kbps)', value: 'low' },
            { label: 'Medium (192 kbps)', value: 'medium' },
            { label: 'High (320 kbps)', value: 'high' },
            { label: 'Lossless', value: 'lossless' },
          ]}
        />
      </SettingSection>
    </div>
  );
};

export default PreferenceWindow;
