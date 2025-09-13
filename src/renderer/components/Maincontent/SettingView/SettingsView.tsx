import React from 'react';
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';
import styles from './Settings.module.css';

import SettingsGroup from './parts/SettingsGroup';
import SettingRow from './parts/SettingRow';
import Switch from './controls/Switch';
import Select from './controls/Select';
import ColorSelect from './controls/ColorSelect';
import Slider from './controls/Slider';
import Segmented from './controls/Segmented';
import ColorSeed from './controls/ColorSeed';
import { AppIcon, getIconOptions } from '@src/shared/hifiniCookies';

import { useSetting } from '@renderer/core/config/SettingsContext'; // ← 关键：用新的 useSetting
import { PRESET_SEEDS } from '@renderer/theme/presets';

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
  const seedPresets = useSetting<string[]>('theme.materialSeedPresets', []);
  const [newSeed, setNewSeed] = React.useState('');

  const progressSkin = useSetting<ProgressSkin>('audio.progressSkin', 'classic');
  const volume = useSetting<number>('audio.volume', 0.8);

  const sidebarCollapsed = useSetting<boolean>('ui.sidebarCollapsed', true);
  const appIcon = useSetting<AppIcon>('app.icon', AppIcon.Default);

  // 唱机（转速）设置：预设/自定义
  const ttMode = useSetting<'preset'|'custom'>('ui.turntable.speedMode', 'preset');
  const ttPreset = useSetting<'slow'|'medium'|'fast'>('ui.turntable.preset', 'medium');
  const ttCustom = useSetting<number>('ui.turntable.customAngularVelocityRadPerSec', 0.4488);

  // 新增：用户、服务、音乐库、网络、缓存
  const userName = useSetting<string>('user.userName', '');
  const avatarPath = useSetting<string>('user.avatarPath', '');
  const bbsSid = useSetting<string>('services.hifiniCookie.bbs_sid', '');
  const bbsToken = useSetting<string>('services.hifiniCookie.bbs_token', '');
  // AI settings
  const aiEnabled = useSetting<boolean>('services.ai.enabled', false);
  const aiProvider = useSetting<'gemini'>('services.ai.provider', 'gemini');
  const aiKey = useSetting<string>('services.ai.geminiApiKey', '');
  const aiModel = useSetting<string>('services.ai.geminiModel', 'gemini-1.5-flash');
  const scanPaths = useSetting<string[]>('library.scanPaths', []);
  const supportedFormats = useSetting<string[]>('library.supportedFormats', ['mp3','flac','wav','m4a','ogg','aac']);
  const networkPort = useSetting<number>('network.port', 29321);
  const cacheTime = useSetting<number>('cache.cacheTime', 3600);

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
              label="种子色预设"
              sub="按名称选择，并预览色块"
              control={
                (() => {
                  const toTitle = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, s => s.toUpperCase());
                  // 1) 内置预设（带名称）
                  const builtin = Object.entries(PRESET_SEEDS).map(([name, hex]) => ({ label: toTitle(name), hex }));
                  // 2) 用户自定义（可能与内置重复，去重后追加）
                  const customList = (seedPresets.value || []).filter(Boolean);
                  const seen = new Set(builtin.map(b => b.hex.toLowerCase()));
                  const customs = customList
                    .filter(h => !seen.has(h.toLowerCase()))
                    .map(h => ({ label: h.toUpperCase(), hex: h }));
                  const options = [...builtin, ...customs];
                  return (
                    <ColorSelect
                      value={seedHex.value}
                      options={options}
                      onChange={(hex) => seedHex.setValue(hex)}
                    />
                  );
                })()
              }
            />
          )}
          {themeSource.value === 'material-you' && (
            <SettingRow
              label="添加种子预设"
              sub="输入 #RRGGBB 并添加"
              control={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="#6750A4"
                    value={newSeed}
                    onChange={(e) => setNewSeed(e.target.value)}
                    style={{ height: 28, borderRadius: 999, background: 'rgba(var(--md-sys-color-surface-variant), .35)', border: '1px solid rgb(var(--md-sys-color-outline-variant))', color: 'rgb(var(--md-sys-color-on-surface))', padding: '0 10px', width: 140 }}
                  />
                  <button
                    onClick={() => {
                      const hex = newSeed.trim();
                      if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return;
                      const list = Array.from(new Set([...(seedPresets.value || []), hex]));
                      seedPresets.setValue(list);
                      setNewSeed('');
                    }}
                    style={{ height: 28, padding: '0 12px', borderRadius: 999, background: 'rgb(var(--md-sys-color-primary))', color: '#fff', border: 'none' }}
                  >添加</button>
                </div>
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

        <SettingsGroup title="唱机" desc="唱片转速（rad/s）">
          <SettingRow
            label="速度模式"
            sub="选择预设或自定义速度"
            control={
              <Segmented<'preset'|'custom'>
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
                <Segmented<'slow'|'medium'|'fast'>
                  value={ttPreset.value}
                  onChange={ttPreset.setValue}
                  options={[{ label: '慢', value: 'slow' }, { label: '中', value: 'medium' }, { label: '快', value: 'fast' }]}
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
                  style={{ height: 28, borderRadius: 999, background: 'rgba(var(--md-sys-color-surface-variant), .35)', border: '1px solid rgb(var(--md-sys-color-outline-variant))', color: 'rgb(var(--md-sys-color-on-surface))', padding: '0 10px', width: 180 }}
                />
              }
            />
          )}
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

        <SettingsGroup title="应用" desc="图标与外观">
          <SettingRow
            label="应用图标"
            sub="切换 Dock/任务栏图标（macOS 需要）"
            control={
              <Select<AppIcon>
                value={appIcon.value}
                onChange={appIcon.setValue}
                options={getIconOptions() as any}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="用户" desc="基础资料">
          <SettingRow
            label="用户名"
            control={
              <input
                type="text"
                value={userName.value}
                onChange={(e) => userName.setValue(e.target.value)}
                placeholder="输入昵称"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 200,
                }}
              />
            }
          />
          <SettingRow
            label="头像路径"
            sub="可在个人中心中上传头像；此处为只读预览"
            control={
              <input
                type="text"
                value={avatarPath.value}
                readOnly
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .25)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 320,
                  opacity: .8,
                }}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="服务" desc="HiFiNi Cookie">
          <SettingRow
            label="bbs_sid"
            control={
              <input
                type="text"
                value={bbsSid.value}
                onChange={(e) => bbsSid.setValue(e.target.value)}
                placeholder="粘贴 bbs_sid"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 320,
                }}
              />
            }
          />
          <SettingRow
            label="bbs_token"
            control={
              <input
                type="text"
                value={bbsToken.value}
                onChange={(e) => bbsToken.setValue(e.target.value)}
                placeholder="粘贴 bbs_token"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 320,
                }}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="AI" desc="LLM 清洗搜索标题（需要重启生效）">
          <SettingRow
            label="启用 AI 清洗"
            sub="在聚合搜索结果中使用 LLM 解析标题/歌手"
            control={<Switch checked={!!aiEnabled.value} onChange={aiEnabled.setValue} />}
          />
          <SettingRow
            label="提供方"
            sub="当前仅支持 Gemini"
            control={
              <Segmented<'gemini'>
                value={aiProvider.value}
                onChange={aiProvider.setValue}
                options={[{ label: 'Gemini', value: 'gemini' }]}
              />
            }
          />
          <SettingRow
            label="API Key"
            sub="仅保存在本地设置（不会上传）"
            control={
              <input
                type="password"
                value={aiKey.value}
                onChange={(e) => aiKey.setValue(e.target.value)}
                placeholder="粘贴你的 Gemini API Key"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 320,
                }}
              />
            }
          />
          <SettingRow
            label="模型"
            sub="例如 gemini-1.5-flash 或 1.5-pro"
            control={
              <input
                type="text"
                value={aiModel.value}
                onChange={(e) => aiModel.setValue(e.target.value)}
                placeholder="gemini-1.5-flash"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 220,
                }}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="音乐库" desc="扫描路径与支持格式">
          <SettingRow
            label="扫描路径（每行一个）"
            control={
              <textarea
                value={(scanPaths.value || []).join('\n')}
                onChange={(e) => {
                  const list = e.target.value
                    .split(/\n|,|;+/)
                    .map(s => s.trim())
                    .filter(Boolean);
                  scanPaths.setValue(list);
                }}
                placeholder="/Users/you/Music\n/D:/Music"
                rows={4}
                style={{
                  width: 420,
                  borderRadius: 12,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '8px 10px',
                  resize: 'vertical',
                }}
              />
            }
          />
          <SettingRow
            label="支持格式（逗号分隔）"
            control={
              <input
                type="text"
                value={(supportedFormats.value || []).join(',')}
                onChange={(e) => {
                  const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  supportedFormats.setValue(arr);
                }}
                placeholder="mp3,flac,wav,m4a,ogg,aac"
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  minWidth: 320,
                }}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="网络" desc="本地端口">
          <SettingRow
            label="服务端口"
            sub="重启后生效"
            control={
              <input
                type="number"
                min={1}
                max={65535}
                value={networkPort.value}
                onChange={(e) => networkPort.setValue(Number(e.target.value))}
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  width: 120,
                }}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="缓存" desc="磁盘缓存时间（秒）">
          <SettingRow
            label="缓存时间"
            control={
              <input
                type="number"
                min={0}
                step={60}
                value={cacheTime.value}
                onChange={(e) => cacheTime.setValue(Number(e.target.value))}
                style={{
                  height: 28,
                  borderRadius: 999,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '0 10px',
                  width: 160,
                }}
              />
            }
          />
        </SettingsGroup>
      </div>
    </ViewShell>
  );
}
