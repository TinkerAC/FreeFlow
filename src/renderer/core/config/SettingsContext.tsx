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
      const s = await configContext.getAll().catch(() => defaultSettings);
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

// 在启用“每日切换种子颜色”时，跨越午夜后自动重新应用主题（不改动持久化 seed）。
// 这样即使应用长时间运行，第二天也会换色。
function useDailySeedMidnightScheduler(enabled: boolean) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      // 计算到下一次本地午夜的毫秒数
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const delay = Math.max(1000, next.getTime() - now.getTime());
      timer = setTimeout(async () => {
        try {
          // 拿最新的设置并重新应用（applyAllSettings 内部会根据当日计算 seed）
          const s = await configContext.getAll();
          applyAllSettings(s);
        } finally {
          // 继续排下一次
          schedule();
        }
      }, delay);
    }

    if (enabled) schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}

// 将调度器绑定到 SettingsProvider 中，便于拿到当前设置状态。
// 仅当启用 autoDailySeed 且 source 为 material-you 时激活。
export function DailySeedSchedulerBridge(): JSX.Element | null {
  const { settings } = useSettingsContext();
  const autoDaily = !!settings?.theme.autoDailySeed;
  const isMY = settings?.theme.source === 'material-you';
  useDailySeedMidnightScheduler(autoDaily && isMY);
  return null;
}
