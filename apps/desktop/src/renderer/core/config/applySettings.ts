import type { Settings } from '@src/shared/settings/schema';
import { applyMaterialYou } from '@renderer/theme/MaterialYou';

export type EffectiveThemeMode = 'light' | 'dark';

export function resolveMode(mode: Settings['theme']['mode']): EffectiveThemeMode {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  }
  return mode;
}

let removeMqListener: (() => void) | null = null;

export function applyAllSettings(s: Settings) {
  // 1) 明暗
  const eff = resolveMode(s.theme.mode);

  // 2) 主题来源
  if (s.theme.source === 'material-you') {
    const seed = getEffectiveSeed(s);
    applyMaterialYou(seed, eff);
  } else {
    // 预设系统：保留原有方案（示例以主色为主，可继续扩展）
    const root = document.documentElement.style;
    const preset = s.theme.preset;
    const primaryByPreset: Record<string, string> = {
      classic: '99 102 241', // #6366F1
      spotify: '30 215 96',  // #1ED760
      netease: '198 40 40',  // 红
    };
    const rgb = primaryByPreset[preset] || primaryByPreset.classic;
    root.setProperty('--md-sys-color-primary', rgb);
  }

  // 3) UI 密度（示例）
  document.documentElement.style.setProperty('--icon-size', s.ui.density === 'compact' ? '16px' : '18px');

  // 4) 监听系统主题跟随
  if (removeMqListener) {
    removeMqListener();
    removeMqListener = null;
  }
  if (s.theme.mode === 'system' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => {
      const m = mq.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', m);
      if (s.theme.source === 'material-you') {
        applyMaterialYou(getEffectiveSeed(s), m);
      }
    };
    mq.addEventListener?.('change', fn);
    removeMqListener = () => mq.removeEventListener?.('change', fn);
  }
}

// ---------- Helpers ----------

/**
 * 计算当日应使用的种子色。
 * 现在直接返回用户配置的 seed，每日更新逻辑由 SettingsContext 在启动时处理。
 */
function getEffectiveSeed(s: Settings): string {
  return s.theme.seed || '#4f46e5';
}

/** 导出函数供 UI 显示当前实际使用的种子色 */
export function getCurrentEffectiveSeed(s: Settings): string {
  return getEffectiveSeed(s);
}




