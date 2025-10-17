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
 * - 当 theme.autoDailySeed 为 true 时，基于日期生成稳定的每日随机色。
 * - 否则使用用户配置的 seed。
 */
let currentDaySeed: string | null = null;
let currentDayKey: string | null = null; // YYYY-MM-DD

function getEffectiveSeed(s: Settings): string {
  const base = s.theme.seed || '#4f46e5';
  // 非 Material You 或未开启每日切换：直接使用 base
  if (s.theme.source !== 'material-you' || !s.theme.autoDailySeed) return base;

  const today = dayKey(new Date());

  // 跨日：清空当天缓存以触发新色
  if (currentDayKey !== today) {
    currentDayKey = today;
    currentDaySeed = null;
  }

  // 生成今日种子色（基于日期的稳定伪随机色）
  if (!currentDaySeed) {
    currentDaySeed = generateDailySeed(today);
  }

  return currentDaySeed;
}

/** 导出函数供 UI 显示当前实际使用的种子色 */
export function getCurrentEffectiveSeed(s: Settings): string {
  return getEffectiveSeed(s);
}

/** 简易"年-月-日"键（本地时区） */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 基于日期生成稳定的每日种子色（#RRGGBB）
 * 使用改进的哈希算法，确保颜色分布更均匀且饱和度适中
 */
function generateDailySeed(dateKey: string): string {
  // 使用日期字符串生成可重复的哈希值
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    const char = dateKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // 将哈希值转换为 HSL 颜色空间，然后转为 RGB
  // 这样可以确保生成的颜色更加丰富多彩且饱和度适中
  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash >> 8) % 30); // 60-90%
  const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%
  
  return hslToHex(hue, saturation, lightness);
}

/**
 * HSL 转 HEX 颜色
 */
function hslToHex(h: number, s: number, l: number): string {
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


