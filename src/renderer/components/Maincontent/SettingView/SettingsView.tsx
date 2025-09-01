import React from 'react';
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';
import styles from './Settings.module.css';

import SettingsGroup from './parts/SettingsGroup';
import SettingRow from './parts/SettingRow';
import Switch from './controls/Switch';
import Select from './controls/Select';
import Slider from './controls/Slider';
import Segmented from './controls/Segmented';
import ColorSeed from './controls/ColorSeed';

import { useSetting } from '@renderer/core/config/SettingsContext'; // ← 关键：用新的 useSetting

type ThemeMode = 'system' | 'light' | 'dark';
type ThemeSource = 'material-you' | 'preset';
type ThemePreset = 'classic' | 'spotify' | 'netease';
type ProgressSkin = 'classic' | 'neon' | 'waveform' | 'knob';

export default function SettingsView() {
  // 与 schema 完全对齐
  const themeMode = useSetting<ThemeMode>('theme.mode', 'system');
  const themeSource = useSetting<ThemeSource>('theme.source', 'material-you');
  const seedHex = useSetting<string>('theme.seed', '#66ccff');
  const autoDailySeed = useSetting<boolean>('theme.autoDailySeed', false);
  const preset = useSetting<ThemePreset>('theme.preset', 'classic');

  const progressSkin = useSetting<ProgressSkin>('audio.progressSkin', 'classic');
  const volume = useSetting<number>('audio.volume', 0.8);

  const sidebarCollapsed = useSetting<boolean>('ui.sidebarCollapsed', true);

  const header = (
    <div style={{
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: '1px solid rgb(var(--md-sys-color-outline-variant))',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>设置</div>
      <div style={{ marginLeft: 'auto', opacity: .7, fontSize: 12 }}>更改将自动保存并即时生效</div>
    </div>
  );

  return (
    <ViewShell header={header} padded hideScrollbar>
      <div className={styles.root}>
        <SettingsGroup title="外观" desc="主题模式、来源与配色">
          <SettingRow
            label="主题模式"
            sub="跟随系统或强制浅色/深色"
            control={
              <Segmented<ThemeMode>
                value={themeMode.value}
                onChange={themeMode.setValue}
                options={[
                  { label: '系统', value: 'system' },
                  { label: '浅色', value: 'light' },
                  { label: '深色', value: 'dark' },
                ]}
              />
            }
          />
          <SettingRow
            label="主题来源"
            sub="Material You 或预设"
            control={
              <Segmented<ThemeSource>
                value={themeSource.value}
                onChange={themeSource.setValue}
                options={[
                  { label: 'Material You', value: 'material-you' },
                  { label: '预设', value: 'preset' },
                ]}
              />
            }
          />
          {themeSource.value === 'material-you' ? (
            <SettingRow
              label="Material You 种子色"
              sub="更改后立即应用"
              control={<ColorSeed hex={seedHex.value} onChange={seedHex.setValue} />}
            />
          ) : (
            <SettingRow
              label="预设主题"
              sub="从内置方案中选择"
              control={
                <Select<ThemePreset>
                  value={preset.value}
                  onChange={preset.setValue}
                  options={[
                    { label: 'Classic', value: 'classic' },
                    { label: 'Spotify', value: 'spotify' },
                    { label: 'Netease', value: 'netease' },
                  ]}
                />
              }
            />
          )}
          {themeSource.value === 'material-you' && (
            <SettingRow
              label="每日设置新的种子颜色"
              sub="每天自动更换 Material You 种子色"
              control={<Switch checked={!!autoDailySeed.value} onChange={autoDailySeed.setValue} />}
            />
          )}
          <SettingRow
            label="进度条皮肤"
            sub="Classic / Neon / Waveform / Knob"
            control={
              <Select<ProgressSkin>
                value={progressSkin.value}
                onChange={progressSkin.setValue}
                options={[
                  { label: 'Classic', value: 'classic' },
                  { label: 'Neon', value: 'neon' },
                  { label: 'Waveform', value: 'waveform' },
                  { label: 'Knob', value: 'knob' },
                ]}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="播放" desc="默认音量">
          <SettingRow
            label="默认音量"
            sub={`${Math.round(volume.value * 100)}%`}
            control={<Slider value={volume.value} min={0} max={1} step={0.01} onChange={volume.setValue} />}
          />
        </SettingsGroup>

        <SettingsGroup title="界面" desc="侧栏">
          <SettingRow
            label="默认收起左侧音乐库"
            control={<Switch checked={sidebarCollapsed.value} onChange={sidebarCollapsed.setValue} />}
          />
        </SettingsGroup>
      </div>
    </ViewShell>
  );
}
