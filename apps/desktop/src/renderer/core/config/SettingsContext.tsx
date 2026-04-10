import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Settings } from '@src/shared/settings/schema';
import { defaultSettings } from '@src/shared/settings/schema';
import { configContext } from '@renderer/core/electronContextApi';
import { applyAllSettings } from '@renderer/core/config/applySettings';

type Ctx = {
  settings: Settings | null;
  /** 乐观更新 + 持久化 */
  setByPath: <T>(path: string, value: T) => Promise<void>;
  /** 批量更新 */
  patch: (partial: Partial<Settings>) => Promise<void>;
};

const SettingsCtx = createContext<Ctx | null>(null);

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPathLocal(obj: any, path: string, value: any) {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  // 初始化 & 订阅
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      let s = await configContext.getAll().catch(() => defaultSettings);
      s = await refreshDailySeedIfNeeded(s);

      setSettings(s);
      applyAllSettings(s);

      unsub = configContext.subscribe((next) => {
        setSettings(next);
        applyAllSettings(next);
      });
    })();

    return () => {
      unsub?.();
    };
  }, []);

  // 乐观 setByPath：先改本地 & apply，再 IPC 持久化；失败则回滚
  const setByPath = async <T, >(path: string, value: T) => {
    if (!settings) return;
    const prev = settings;
    const next = structuredClone(prev);
    setByPathLocal(next, path, value);
    setSettings(next);
    applyAllSettings(next); // 立即生效（不等 IPC）

    try {
      // 主进程落盘
      await configContext.setByPath(path, value);
    } catch (e) {
      // 回滚
      console.error('config setByPath failed, rollback', e);
      setSettings(prev);
      applyAllSettings(prev);
      throw e;
    }
  };

  const patch = async (partial: Partial<Settings>) => {
    if (!settings) return;
    const prev = settings;
    const next = { ...prev, ...partial };
    setSettings(next);
    applyAllSettings(next);
    try {
      await configContext.patch(partial);
    } catch (e) {
      console.error('config patch failed, rollback', e);
      setSettings(prev);
      applyAllSettings(prev);
      throw e;
    }
  };

  const value = useMemo<Ctx>(() => ({ settings, setByPath, patch }), [settings]);

  const hasSettings = !!settings;
  const autoDailySeedEnabled = settings?.theme.autoDailySeed ?? false;
  const themeSource = settings?.theme.source ?? 'material-you';

  useEffect(() => {
    if (!hasSettings) return;
    if (themeSource !== 'material-you' || !autoDailySeedEnabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const delay = Math.max(1000, next.getTime() - now.getTime());
      timer = setTimeout(() => {
        void (async () => {
          if (!settings) return;
          const nextSettings = await refreshDailySeedIfNeeded(settings);
          setSettings(nextSettings);
          applyAllSettings(nextSettings);
        })()
          .catch((error) => {
            console.error('[Settings] Failed to refresh daily seed', error);
          })
          .finally(() => {
            scheduleNext();
          });
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [autoDailySeedEnabled, hasSettings, settings, themeSource]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettingsContext() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettingsContext must be used inside <SettingsProvider>');
  return ctx;
}

/** 简易按路径读取 */
export function useSetting<T>(path: string, fallback: T) {
  const { settings, setByPath } = useSettingsContext();
  const value = useMemo<T>(() => {
    if (!settings) return fallback;
    const v = getByPath(settings, path);
    return (v === undefined || v === null) ? fallback : (v as T);
  }, [settings, path, fallback]);

  const setValue = (v: T) => setByPath<T>(path, v);
  return { value, setValue } as const;
}

/** 简易"年-月-日"键（本地时区） */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function refreshDailySeedIfNeeded(current: Settings): Promise<Settings> {
  if (current.theme.source !== 'material-you' || !current.theme.autoDailySeed) {
    return current;
  }

  const today = dayKey(new Date());
  if (current.theme.lastDailySeedDate === today) {
    return current;
  }

  const newSeed = generateDailySeed(today);
  console.log('[Settings] Generating daily seed:', newSeed);

  Promise.all([
    configContext.set('theme.seed', newSeed),
    configContext.set('theme.lastDailySeedDate', today),
  ]).catch((error) => {
    console.error('[Settings] Failed to persist daily seed update', error);
  });

  return {
    ...current,
    theme: {
      ...current.theme,
      seed: newSeed,
      lastDailySeedDate: today,
    },
  };
}

/**
 * 基于日期生成稳定的每日种子色（#RRGGBB）
 */
function generateDailySeed(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    const char = dateKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash >> 8) % 30); // 60-90%
  const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%

  return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number): string {
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
