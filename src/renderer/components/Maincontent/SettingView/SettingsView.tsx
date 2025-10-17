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

import { useSetting, useSettingsContext } from '@renderer/core/config/SettingsContext'; // ← 关键：用新的 useSetting
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

export default function SettingsView() {
  const volume = useSetting<number>('audio.volume', 0.8);

  const sidebarCollapsed = useSetting<boolean>('ui.sidebarCollapsed', true);
  const appIcon = useSetting<AppIcon>('app.icon', AppIcon.Default);

  // 唱机（转速）设置：预设/自定义
  const ttMode = useSetting<'preset' | 'custom'>('ui.turntable.speedMode', 'preset');
  const ttPreset = useSetting<'slow' | 'medium' | 'fast'>('ui.turntable.preset', 'medium');
  const ttCustom = useSetting<number>('ui.turntable.customAngularVelocityRadPerSec', 0.4488);

  // 新增：用户、服务、音乐库、网络、缓存
  const userName = useSetting<string>('user.userName', '');
  const avatarPath = useSetting<string>('user.avatarPath', '');
  const bbsSid = useSetting<string>('services.hifiniCookie.bbs_sid', '');
  const bbsToken = useSetting<string>('services.hifiniCookie.bbs_token', '');
  const youtubeCookie = useSetting<string>('services.youtubeMusic.cookie', '');
  const youtubeVisitor = useSetting<string>('services.youtubeMusic.visitorData', '');
  // AI settings
  const aiEnabled = useSetting<boolean>('services.ai.enabled', false);
  const aiProvider = useSetting<'gemini'>('services.ai.provider', 'gemini');
  const aiKey = useSetting<string>('services.ai.geminiApiKey', '');
  const aiModel = useSetting<string>('services.ai.geminiModel', 'gemini-1.5-flash');
  const scanPaths = useSetting<string[]>('library.scanPaths', []);
  const supportedFormats = useSetting<string[]>('library.supportedFormats', ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac']);
  const networkPort = useSetting<number>('network.port', 29321);
  const cacheTime = useSetting<number>('cache.cacheTime', 3600);
  const [ytSyncing, setYtSyncing] = React.useState(false);
  const [ytMessage, setYtMessage] = React.useState('');

  const youtubeCookiePreview = React.useMemo(() => {
    const raw = youtubeCookie.value?.trim?.() ?? '';
    if (!raw) return '未配置';
    return raw.length > 48 ? `${raw.slice(0, 48)}…` : raw;
  }, [youtubeCookie.value]);

  const youtubeVisitorPreview = React.useMemo(() => {
    const raw = youtubeVisitor.value?.trim?.() ?? '';
    if (!raw) return '未配置';
    return raw.length > 32 ? `${raw.slice(0, 32)}…` : raw;
  }, [youtubeVisitor.value]);

  const openYouTubeLoginWindow = async () => {
    try {
      await window.mainApi.youtubeMusicApi.openLoginWindow();
      setYtMessage('已打开 YouTube Music 登录窗口，请在新窗口完成登录。');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      setYtMessage(`打开登录窗口失败：${msg}`);
    }
  };

  const syncYouTubeCredentials = async () => {
    setYtSyncing(true);
    try {
      const result = await window.mainApi.youtubeMusicApi.syncCredentials();
      if (result?.cookie !== undefined) youtubeCookie.setValue(result.cookie ?? '');
      if (result?.visitorData !== undefined) youtubeVisitor.setValue(result.visitorData ?? '');
      if (result?.cookie) {
        setYtMessage('已同步 Cookie 并写入设置。');
      } else {
        setYtMessage('未获取到 Cookie，请确认已在登录窗口完成登录后重试。');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      setYtMessage(`同步失败：${msg}`);
    } finally {
      setYtSyncing(false);
    }
  };

  const clearYouTubeCredentials = () => {
    youtubeCookie.setValue('');
    youtubeVisitor.setValue('');
    setYtMessage('已清除 YouTube Music 凭据。');
  };

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

        <SettingsGroup title="服务" desc="HiFiNi Cookie & YouTube Music">
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
          <SettingRow
            label="YouTube 登录"
            sub="打开登录窗口并同步 Cookie 到设置"
            control={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={openYouTubeLoginWindow}
                    style={{
                      height: 28,
                      padding: '0 14px',
                      borderRadius: 999,
                      background: 'rgb(var(--md-sys-color-primary))',
                      color: '#fff',
                      border: 'none',
                    }}
                  >打开登录窗口
                  </button>
                  <button
                    onClick={syncYouTubeCredentials}
                    disabled={ytSyncing}
                    style={{
                      height: 28,
                      padding: '0 14px',
                      borderRadius: 999,
                      background: ytSyncing ? 'rgba(var(--md-sys-color-primary), .25)' : 'rgba(var(--md-sys-color-primary), .12)',
                      color: 'rgb(var(--md-sys-color-primary))',
                      border: '1px solid rgba(var(--md-sys-color-primary), .35)',
                      cursor: ytSyncing ? 'wait' : 'pointer',
                    }}
                  >{ytSyncing ? '同步中…' : '同步 Cookie'}</button>
                  <button
                    onClick={clearYouTubeCredentials}
                    style={{
                      height: 28,
                      padding: '0 14px',
                      borderRadius: 999,
                      background: 'rgba(var(--md-sys-color-error), .15)',
                      color: 'rgb(var(--md-sys-color-error))',
                      border: '1px solid rgba(var(--md-sys-color-error), .35)',
                    }}
                  >清除
                  </button>
                </div>
                <div style={{ fontSize: 12, opacity: .8 }}>
                  {ytMessage || `当前 Cookie：${youtubeCookiePreview}｜VISITOR_DATA：${youtubeVisitorPreview}`}
                </div>
              </div>
            }
          />
          <SettingRow
            label="Cookie"
            sub="如需手动粘贴，请保持原始格式"
            control={
              <textarea
                value={youtubeCookie.value}
                onChange={(e) => youtubeCookie.setValue(e.target.value)}
                rows={3}
                placeholder="例如 VISITOR_INFO1_LIVE=...; SID=..."
                style={{
                  borderRadius: 12,
                  background: 'rgba(var(--md-sys-color-surface-variant), .35)',
                  border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                  color: 'rgb(var(--md-sys-color-on-surface))',
                  padding: '8px 12px',
                  minWidth: 320,
                  resize: 'vertical',
                }}
              />
            }
          />
          <SettingRow
            label="VISITOR_DATA"
            sub="用于部分受限接口，通常可在同步时自动提取"
            control={
              <input
                type="text"
                value={youtubeVisitor.value}
                onChange={(e) => youtubeVisitor.setValue(e.target.value)}
                placeholder="例如 CgtoZ3Y0b1J0X1ZpSg=="
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
