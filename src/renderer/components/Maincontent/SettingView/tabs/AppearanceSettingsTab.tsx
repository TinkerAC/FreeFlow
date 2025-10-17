
import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import Switch from '../controls/Switch';
import Select from '../controls/Select';
import ColorSelect from '../controls/ColorSelect';
import Slider from '../controls/Slider';
import Segmented from '../controls/Segmented';
import ColorSeed from '../controls/ColorSeed';
import { AppIcon, getIconOptions } from '@src/shared/hifiniCookies';

import { useSetting, useSettingsContext } from '@renderer/core/config/SettingsContext';
import { PRESET_SEEDS } from '@renderer/theme/presets';
import { getCurrentEffectiveSeed } from '@renderer/core/config/applySettings';

type ThemeMode = 'system' | 'light' | 'dark';
type ThemeSource = 'material-you' | 'preset';
type ThemePreset = 'classic' | 'spotify' | 'netease';
type ProgressSkin = 'classic' | 'neon' | 'waveform' | 'knob';

function ThemeSettingsSection() {
  const themeMode = useSetting<ThemeMode>('theme.mode', 'system');
  const themeSource = useSetting<ThemeSource>('theme.source', 'material-you');
  const seedHex = useSetting<string>('theme.seed', '#66ccff');
  const autoDailySeed = useSetting<boolean>('theme.autoDailySeed', false);
  const preset = useSetting<ThemePreset>('theme.preset', 'classic');
  const seedPresets = useSetting<string[]>('theme.materialSeedPresets', []);
  const progressSkin = useSetting<ProgressSkin>('audio.progressSkin', 'classic');
  const { settings } = useSettingsContext();
  const [newSeedInput, setNewSeedInput] = React.useState('');

  const materialSeedOptions = React.useMemo(() => {
    const toTitle = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^[a-z]/, c => c.toUpperCase());
    const builtin = Object.entries(PRESET_SEEDS).map(([name, hex]) => ({ label: toTitle(name), hex }));
    const customList = (seedPresets.value || []).filter(Boolean);
    const seen = new Set(builtin.map(item => item.hex.toLowerCase()));
    const deduped = customList
      .filter(hex => !seen.has(hex.toLowerCase()))
      .map(hex => ({ label: hex.toUpperCase(), hex }));
    return [...builtin, ...deduped];
  }, [seedPresets.value]);

  const currentEffectiveSeed = React.useMemo(() => (
    settings ? getCurrentEffectiveSeed(settings) : seedHex.value
  ), [settings, seedHex.value]);

  const normalizedEffectiveSeed = React.useMemo(() => (
    (currentEffectiveSeed || '#000000').toUpperCase()
  ), [currentEffectiveSeed]);

  const isSeedInputValid = React.useMemo(() => (
    /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(newSeedInput.trim())
  ), [newSeedInput]);

  const handleAddPreset = React.useCallback(() => {
    const hex = newSeedInput.trim();
    if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return;
    const existing = (seedPresets.value || []).map(item => item.toUpperCase());
    const next = Array.from(new Set([...existing, hex.toUpperCase()]));
    seedPresets.setValue(next);
    setNewSeedInput('');
  }, [newSeedInput, seedPresets]);

  const showMaterialControls = themeSource.value === 'material-you';

  return (
    <SettingsGroup title="外观" desc="主题模式、来源与配色">
      <SettingRow
        label="主题模式"
        sub="跟随系统或强制浅色/深色"
        control={(
          <Segmented<ThemeMode>
            value={themeMode.value}
            onChange={themeMode.setValue}
            options={[
              { label: '系统', value: 'system' },
              { label: '浅色', value: 'light' },
              { label: '深色', value: 'dark' },
            ]}
          />
        )}
      />
      <SettingRow
        label="主题来源"
        sub="Material You 或预设"
        control={(
          <Segmented<ThemeSource>
            value={themeSource.value}
            onChange={themeSource.setValue}
            options={[
              { label: 'Material You', value: 'material-you' },
              { label: '预设', value: 'preset' },
            ]}
          />
        )}
      />

      {showMaterialControls ? (
        <>
          <SettingRow
            label="基础种子色"
            sub="调整后即时刷新 Material You 配色"
            control={<ColorSeed hex={seedHex.value} onChange={seedHex.setValue} />}
          />
          <SettingRow
            label="快速选择"
            sub="从内置与收藏方案中切换"
            control={(
              <ColorSelect
                value={seedHex.value}
                options={materialSeedOptions}
                onChange={(hex) => seedHex.setValue(hex)}
              />
            )}
          />
          <SettingRow
            label="收藏种子色"
            sub="输入 #RRGGBB / #RRGGBBAA 添加到列表"
            control={(
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="#6750A4"
                  value={newSeedInput}
                  onChange={(e) => setNewSeedInput(e.target.value)}
                  style={{
                    height: 28,
                    borderRadius: 999,
                    background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                    border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                    color: 'rgb(var(--md-sys-color-on-surface))',
                    padding: '0 10px',
                    width: 150,
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddPreset}
                  disabled={!isSeedInputValid}
                  style={{
                    height: 28,
                    padding: '0 12px',
                    borderRadius: 999,
                    background: isSeedInputValid ? 'rgb(var(--md-sys-color-primary))' : 'rgba(var(--md-sys-color-outline-variant), .45)',
                    color: '#fff',
                    border: 'none',
                    cursor: isSeedInputValid ? 'pointer' : 'not-allowed',
                    opacity: isSeedInputValid ? 1 : 0.65,
                  }}
                >添加
                </button>
              </div>
            )}
          />
          <SettingRow
            label="每日随机种子"
            sub="每天凌晨自动生成新的种子色"
            control={(
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Switch checked={!!autoDailySeed.value} onChange={autoDailySeed.setValue} />
                {autoDailySeed.value && <SeedBadge hex={normalizedEffectiveSeed} caption="今日" />}
              </div>
            )}
          />
        </>
      ) : (
        <SettingRow
          label="预设主题"
          sub="从内置方案中选择"
          control={(
            <Select<ThemePreset>
              value={preset.value}
              onChange={preset.setValue}
              options={[
                { label: 'Classic', value: 'classic' },
                { label: 'Spotify', value: 'spotify' },
                { label: 'Netease', value: 'netease' },
              ]}
            />
          )}
        />
      )}

      <SettingRow
        label="进度条皮肤"
        sub="Classic / Neon / Waveform / Knob"
        control={(
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
        )}
      />
    </SettingsGroup>
  );
}

function SeedBadge({ hex, caption }: { hex: string; caption?: string }) {
  const normalized = (hex || '#000000').toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(var(--md-sys-color-surface-variant), .25)',
        border: '1px solid rgb(var(--md-sys-color-outline-variant))',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: normalized,
          border: '2px solid rgba(255,255,255,.2)',
          boxShadow: '0 2px 8px rgba(0,0,0,.15)',
        }}
      />
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas',
          fontSize: 13,
          fontWeight: 600,
          color: 'rgb(var(--md-sys-color-on-surface))',
        }}
      >
        {normalized}
      </span>
      {caption ? (
        <span style={{ fontSize: 12, opacity: 0.75, color: 'rgb(var(--md-sys-color-on-surface))' }}>{caption}</span>
      ) : null}
    </div>
  );
}

export default function AppearanceSettingsTab() {
  const sidebarCollapsed = useSetting<boolean>('ui.sidebarCollapsed', true);
  const ttMode = useSetting<'preset' | 'custom'>('ui.turntable.speedMode', 'preset');
  const ttPreset = useSetting<'slow' | 'medium' | 'fast'>('ui.turntable.preset', 'medium');
  const ttCustom = useSetting<number>('ui.turntable.customAngularVelocityRadPerSec', 0.4488);

  return (
    <>
      <ThemeSettingsSection />
      <SettingsGroup title="唱机" desc="唱片转速（rad/s）">
          <SettingRow
            label="速度模式"
            sub="选择预设或自定义速度"
            control={
              <Segmented<'preset' | 'custom'>
                value={ttMode.value}
                onChange={ttMode.setValue}
                options={[{ label: '预设', value: 'preset' }, { label: '自定义', value: 'custom' }]}
              />
            }
          />
          {ttMode.value === 'preset' ? (
            <SettingRow
              label="预设档位"
              sub="慢 / 中 / 快"
              control={
                <Segmented<'slow' | 'medium' | 'fast'>
                  value={ttPreset.value}
                  onChange={ttPreset.setValue}
                  options={[{ label: '慢', value: 'slow' }, { label: '中', value: 'medium' }, {
                    label: '快',
                    value: 'fast',
                  }]}
                />
              }
            />
          ) : (
            <SettingRow
              label="自定义速度"
              sub="rad/s（范围 0.01 - 20）"
              control={
                <input
                  type="number" min={0.01} max={20} step={0.01}
                  value={ttCustom.value}
                  onChange={(e) => ttCustom.setValue(Math.max(0.01, Math.min(20, Number(e.target.value))))}
                  style={{
                    height: 28,
                    borderRadius: 999,
                    background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                    border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                    color: 'rgb(var(--md-sys-color-on-surface))',
                    padding: '0 10px',
                    width: 180,
                  }}
                />
              }
            />
          )}
        </SettingsGroup>
      <SettingsGroup title="界面" desc="侧栏">
        <SettingRow
          label="默认收起左侧音乐库"
          control={<Switch checked={sidebarCollapsed.value} onChange={sidebarCollapsed.setValue} />}
        />
      </SettingsGroup>
    </>
  );
}
