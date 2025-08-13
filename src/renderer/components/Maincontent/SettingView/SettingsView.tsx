// file: src/renderer/components/Maincontent/SettingView/SettingsView.tsx
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

// 读取/写入设置
import { useSetting } from '@components/Maincontent/SettingView/useSettings';

type ThemeMode = 'system' | 'light' | 'dark';
type ProgressSkin = 'classic' | 'neon' | 'waveform' | 'knob';

export default function SettingsView() {
  // 外观（✅ 与 schema 对齐）
  const themeMode = useSetting<ThemeMode>('theme.mode', 'system');
  const seedHex = useSetting<string>('theme.seed', '#6750A4');
  const skin = useSetting<ProgressSkin>('audio.progressSkin', 'classic'); // ⬅ 修正！

  // 播放（如果 schema 没定义这两个 key，会被 parse 掉；需要就把它们加到 schema 再用）
  const volStep = useSetting<number>('audio.volumeStep', 10);
  const crossfade = useSetting<boolean>('audio.crossfade', false);

  // 音乐库 / 高级
  const collapsedDefault = useSetting<boolean>('ui.sidebarCollapsed', false);
  const sortBy = useSetting<'title' | 'date'>('library.sortBy', 'date');
  const hwAccel = useSetting<boolean>('advanced.hwAcceleration', true);

  const header = (
    <div style={{
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: '1px solid rgb(var(--md-sys-color-outline-variant))',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>设置</div>
      <div style={{ marginLeft: 'auto', opacity: .7, fontSize: 12 }}>更改将自动保存</div>
    </div>
  );

  return (
    <ViewShell header={header} padded hideScrollbar>
      <div className={styles.root}>
        {/* 外观 */}
        <SettingsGroup title="外观" desc="主题模式、动态配色与进度条皮肤">
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
            label="Material You 种子色"
            sub="选择种子色，自动生成整套 M3 配色"
            control={<ColorSeed hex={seedHex.value} onChange={seedHex.setValue} />}
          />
          <SettingRow
            label="进度条皮肤"
            sub="切换不同的播放进度视觉样式"
            control={
              <Select<ProgressSkin>
                value={skin.value}
                onChange={skin.setValue}
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

        {/* 播放 */}
        <SettingsGroup title="播放" desc="播放体验相关设置">
          <SettingRow
            label="音量调节步长"
            sub={`${volStep.value}% 每次`}
            control={<Slider value={volStep.value} min={1} max={25} step={1} onChange={volStep.setValue} />}
          />
          <SettingRow
            label="交叉渐入/渐出"
            sub="在切歌时淡入淡出（实验性）"
            control={<Switch checked={crossfade.value} onChange={crossfade.setValue} />}
          />
        </SettingsGroup>

        {/* 音乐库 */}
        <SettingsGroup title="音乐库" desc="侧栏与排序偏好">
          <SettingRow
            label="默认收起左侧音乐库"
            control={<Switch checked={collapsedDefault.value} onChange={collapsedDefault.setValue} />}
          />
          <SettingRow
            label="歌单排序"
            sub="选择列表默认排序方式"
            control={
              <Select<'title' | 'date'>
                value={sortBy.value}
                onChange={sortBy.setValue}
                options={[
                  { label: '最新添加', value: 'date' },
                  { label: '标题（A→Z）', value: 'title' },
                ]}
              />
            }
          />
        </SettingsGroup>

        {/* 高级 */}
        <SettingsGroup title="高级" desc="性能与调试">
          <SettingRow
            label="启用硬件加速（需重启）"
            control={<Switch checked={hwAccel.value} onChange={hwAccel.setValue} />}
          />
          <hr className={styles.divider} />
          <SettingRow
            label="清理缓存"
            sub="清除歌词/封面/搜索缓存，释放空间"
            control={<button className={styles.btnGhost}
                             onClick={() => window.location.reload()}>立即清理并重启</button>}
          />
        </SettingsGroup>
      </div>
    </ViewShell>
  );
}