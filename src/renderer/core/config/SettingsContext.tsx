import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Settings } from '@src/shared/settings/schema';
import { defaultSettings } from '@src/shared/settings/schema';
import { configContext } from '@renderer/core/electronContextApi';
import { applyAllSettings } from '@renderer/core/config/applySettings';
import chalk from 'chalk';

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
  console.debug(chalk.blue(`[useSetting] ${path} =`, value));
  return { value, setValue } as const;
}