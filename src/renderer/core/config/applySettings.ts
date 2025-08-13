// src/renderer/core/settings/applySettings.ts
import type { Settings } from '@src/shared/settings/schema';
import { applyMaterialYou } from '@renderer/theme/MaterialYou';

export type EffectiveThemeMode = 'light' | 'dark';

export function resolveMode(mode: Settings['theme']['mode']): EffectiveThemeMode {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  }
  return mode;
}

function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

/** 一些常用 MD 变量赋值（覆盖最常用到的那批） */
function assignPalette(p: Record<string, string>) {
  Object.entries(p).forEach(([k, v]) => setVar(`--md-sys-color-${k}`, v));
}

/** Spotify / Netease 简易预设 */
function getPresetPalette(source: 'spotify' | 'netease', mode: EffectiveThemeMode): Record<string, string> {
  if (source === 'spotify') {
    // 品牌绿 #1DB954
    const primary = mode === 'dark' ? '#1ED760' : '#1DB954';
    const surface = mode === 'dark' ? '#121212' : '#F6F6F7';
    const onSurface = mode === 'dark' ? '#EAEAEA' : '#111827';
    const surfaceVar = mode === 'dark' ? '#2A2A2A' : '#EDEDEF';
    return {
      primary,
      'on-primary': '#ffffff',
      'primary-container': primary,
      'on-primary-container': '#ffffff',
      surface,
      'on-surface': onSurface,
      'surface-variant': surfaceVar,
      'on-surface-variant': mode === 'dark' ? '#C7C7C7' : '#4B5563',
      'outline-variant': mode === 'dark' ? '#3A3A3A' : '#D1D5DB',
      'surface-container-low': mode === 'dark' ? '#161616' : '#FAFAFA',
      'surface-container': mode === 'dark' ? '#191919' : '#FFFFFF',
      'surface-container-high': mode === 'dark' ? '#202020' : '#F5F5F5',
    };
  }
  // netease，品牌红 #D33A31
  const primary = mode === 'dark' ? '#FF4D42' : '#D33A31';
  const surface = mode === 'dark' ? '#161617' : '#FAFAFA';
  const onSurface = mode === 'dark' ? '#ECECED' : '#111827';
  const surfaceVar = mode === 'dark' ? '#2A2A2B' : '#E8E8EA';
  return {
    primary,
    'on-primary': '#ffffff',
    'primary-container': primary,
    'on-primary-container': '#ffffff',
    surface,
    'on-surface': onSurface,
    'surface-variant': surfaceVar,
    'on-surface-variant': mode === 'dark' ? '#C9C9CB' : '#4B5563',
    'outline-variant': mode === 'dark' ? '#3B3B3D' : '#D1D5DB',
    'surface-container-low': mode === 'dark' ? '#1A1A1B' : '#FFFFFF',
    'surface-container': mode === 'dark' ? '#1E1E1F' : '#FFFFFF',
    'surface-container-high': mode === 'dark' ? '#252526' : '#F5F5F7',
  };
}

function applyPresetTheme(source: 'spotify' | 'netease', mode: EffectiveThemeMode) {
  const p = getPresetPalette(source, mode);
  assignPalette(p);
}

let removeMqListener: (() => void) | null = null;

/** 应用整份设置（在启动 & 配置变更时调用） */
export function applyAllSettings(s: Settings) {
  // 1) 明暗模式
  const eff = resolveMode(s.theme.mode);
  document.documentElement.setAttribute('data-theme', eff);

  // 2) 主题来源
  if (s.theme.source === 'material-you') {
    const seed = s.theme.seed || '#4f46e5';
    applyMaterialYou(seed, eff); // 生成一整套 --md-sys-* 变量
  } else if (s.theme.source === 'spotify') {
    applyPresetTheme('spotify', eff);
  } else if (s.theme.source === 'netease') {
    applyPresetTheme('netease', eff);
  }

  // 3) UI 密度（示例：调整 PlayerBar 图标尺寸）
  setVar('--icon-size', s.ui.density === 'compact' ? '16px' : '18px');

  // 4) 跟随系统（system）时监听变化
  if (removeMqListener) {
    removeMqListener();
    removeMqListener = null;
  }
  if (s.theme.mode === 'system' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => {
      const m: EffectiveThemeMode = mq.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', m);
      if (s.theme.source === 'material-you') {
        applyMaterialYou(s.theme.seed || '#4f46e5', m);
      } else if (s.theme.source === 'spotify') {
        applyPresetTheme('spotify', m);
      } else if (s.theme.source === 'netease') {
        applyPresetTheme('netease', m);
      }
    };
    mq.addEventListener?.('change', fn);
    removeMqListener = () => mq.removeEventListener?.('change', fn);
  }
}