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
 * - 当 theme.autoDailySeed 为 true 时，优先使用“当天缓存的种子色”。
 *   如果用户刚修改了 seed，则立即以新 seed 覆盖当天缓存（保证可见的立即生效）。
 * - 否则使用用户配置的 seed。
 */
let currentDaySeed: string | null = null;
let currentDayKey: string | null = null; // YYYY-MM-DD
let lastBaseSeedSeen: string | null = null; // 记录上次参与计算的 base

function getEffectiveSeed(s: Settings): string {
  const base = s.theme.seed || '#4f46e5';
  // 非 Material You 或未开启每日切换：直接使用 base
  if (s.theme.source !== 'material-you' || !s.theme.autoDailySeed) return base;

  const today = dayKey(new Date());

  // 跨日：清空当天缓存以触发新色
  if (currentDayKey !== today) {
    currentDayKey = today;
    currentDaySeed = null;
    lastBaseSeedSeen = null;
  }

  // 如果用户刚修改了 seed（base 变化），则立即采用新的 base 作为当天颜色
  if (lastBaseSeedSeen !== base) {
    currentDaySeed = base;
    lastBaseSeedSeen = base;
  }

  // 正常情况下若没有缓存，则生成一个稳定的“今日色”
  if (!currentDaySeed) {
    // 生成与日期相关、可重复的伪随机色（避免每次刷新都不同）
    currentDaySeed = pseudoRandomHexFrom(`${base}-${today}`);
    lastBaseSeedSeen = base;
  }

  return currentDaySeed;
}

/** 简易“年内第 N 天”（本地时区） */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 生成一个随机种子色（#RRGGBB）
function pseudoRandomHexFrom(key: string): string {
  // 简易可重复 hash（djb2）映射到 24bit 颜色
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) + key.charCodeAt(i);
  const n = (h >>> 0) % 0xFFFFFF;
  return `#${n.toString(16).padStart(6, '0')}`;
}
