import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import Select from '../controls/Select';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { AppIcon, getIconOptions } from '@src/shared/hifiniCookies';

export default function ApplicationSettingsTab() {
  const appIcon = useSetting<AppIcon>('app.icon', AppIcon.Default);

  return (
    <>
      <SettingsGroup title="应用" desc="图标与外观">
        <SettingRow
          label="应用图标"
          sub="切换 Dock/任务栏图标（macOS 需要）"
          control={(
            <Select<AppIcon>
              value={appIcon.value}
              onChange={appIcon.setValue}
              options={getIconOptions() as any}
            />
          )}
        />
      </SettingsGroup>
    </>
  );
}
