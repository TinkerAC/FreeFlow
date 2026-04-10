import React from 'react';
import SettingsGroup from '../parts/SettingsGroup';
import SettingRow from '../parts/SettingRow';
import Switch from '../controls/Switch';
import Select from '../controls/Select';
import Segmented from '../controls/Segmented';
import ColorSeed from '../controls/ColorSeed';

import { useSetting } from '@renderer/core/config/SettingsContext';
import { PRESET_SEEDS, THEME_PRESET_OPTIONS, type PresetName } from '@renderer/theme/presets';

type ThemeMode = 'system' | 'light' | 'dark';
type ThemeSource = 'material-you' | 'preset';
type ThemePreset = PresetName;
type ProgressSkin = 'classic' | 'neon' | 'waveform' | 'knob';

function ThemeSettingsSection() {
  const themeMode = useSetting<ThemeMode>('theme.mode', 'system');
  const themeSource = useSetting<ThemeSource>('theme.source', 'material-you');
  const seedHex = useSetting<string>('theme.seed', '#66ccff');
  const autoDailySeed = useSetting<boolean>('theme.autoDailySeed', false);
  const preset = useSetting<ThemePreset>('theme.preset', 'classic');
  const progressSkin = useSetting<ProgressSkin>('audio.progressSkin', 'classic');
  const [showPresetPalette, setShowPresetPalette] = React.useState(false);

  const generateRandomColor = React.useCallback(() => {
    const randomHex = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    seedHex.setValue(randomHex);
  }, [seedHex]);

  const presetColors = React.useMemo(
    () =>
      THEME_PRESET_OPTIONS.map(({ label, hex, value }) => ({
        label,
        hex,
        value,
      })),
    [],
  );

  const showMaterialControls = themeSource.value === 'material-you';
  const showPresetControls = themeSource.value === 'preset';

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

      {showPresetControls && (
        <SettingRow
          label="预设主题"
          sub="使用预定义 seed 生成整套 Material token"
          control={(
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '999px',
                  background: PRESET_SEEDS[preset.value],
                  boxShadow: '0 0 0 1px rgba(var(--md-sys-color-outline-variant), 0.9)',
                  flexShrink: 0,
                }}
              />
              <Select<ThemePreset>
                value={preset.value}
                onChange={preset.setValue}
                options={THEME_PRESET_OPTIONS.map(({ label, value }) => ({ label, value }))}
              />
            </div>
          )}
        />
      )}

      {showMaterialControls && (
        <>
          <SettingRow
            label="每日随机"
            sub="每天自动生成一个新的主题色"
            control={(
              <Switch
                checked={autoDailySeed.value}
                onChange={autoDailySeed.setValue}
              />
            )}
          />
          <SettingRow
            label="基础种子色"
            sub="选择一个主色调来生成整体配色方案"
            control={(
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <button
                  onClick={generateRandomColor}
                  title="随机生成颜色"
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: '0',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'rgba(var(--md-sys-color-surface-container-high), 0.8)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgb(var(--md-sys-color-surface-container-highest))';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(var(--md-sys-color-surface-container-high), 0.8)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
                    <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                    <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </button>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowPresetPalette(!showPresetPalette)}
                    title="选择预设颜色"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      border: 'none',
                      borderRadius: '6px',
                      background: seedHex.value,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                    }}
                  />

                  {showPresetPalette && (
                    <>
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999,
                        }}
                        onClick={() => setShowPresetPalette(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          background: 'rgb(var(--md-sys-color-surface-container-high))',
                          borderRadius: '12px',
                          padding: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
                          zIndex: 1000,
                          minWidth: '280px',
                          maxHeight: '360px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '8px',
                          }}
                        >
                          {presetColors.map(({ label, hex }) => (
                            <button
                              key={hex}
                              onClick={() => {
                                seedHex.setValue(hex);
                                setShowPresetPalette(false);
                              }}
                              title={label}
                              style={{
                                width: '40px',
                                height: '40px',
                                padding: '0',
                                border: seedHex.value.toLowerCase() === hex.toLowerCase()
                                  ? '3px solid rgb(var(--md-sys-color-primary))'
                                  : '2px solid transparent',
                                borderRadius: '8px',
                                background: hex,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.15)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            />
                          ))}
                        </div>

                        <div
                          style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid rgba(var(--md-sys-color-outline-variant), 0.3)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'rgb(var(--md-sys-color-on-surface-variant))',
                              marginBottom: '8px',
                            }}
                          >
                            自定义颜色
                          </div>
                          <ColorSeed
                            hex={seedHex.value}
                            onChange={seedHex.setValue}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <ColorSeed
                  hex={seedHex.value}
                  onChange={seedHex.setValue}
                />
              </div>
            )}
          />
        </>
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
          control={(
            <Segmented<'preset' | 'custom'>
              value={ttMode.value}
              onChange={ttMode.setValue}
              options={[{ label: '预设', value: 'preset' }, { label: '自定义', value: 'custom' }]}
            />
          )}
        />
        {ttMode.value === 'preset' ? (
          <SettingRow
            label="预设档位"
            sub="慢 / 中 / 快"
            control={(
              <Segmented<'slow' | 'medium' | 'fast'>
                value={ttPreset.value}
                onChange={ttPreset.setValue}
                options={[
                  { label: '慢', value: 'slow' },
                  { label: '中', value: 'medium' },
                  { label: '快', value: 'fast' },
                ]}
              />
            )}
          />
        ) : (
          <SettingRow
            label="自定义速度"
            sub="rad/s（范围 0.01 - 20）"
            control={(
              <input
                type="number"
                min={0.01}
                max={20}
                step={0.01}
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
            )}
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
