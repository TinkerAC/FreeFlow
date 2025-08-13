import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Settings } from '@src/shared/settings/schema';
import { configContext } from '@renderer/core/electronContextApi';
import { applyAllSettings } from '@renderer/core/config/applySettings';

/** --------- small utils --------- */
function getByPath(obj: any, path: string, fallback?: any) {
  if (!obj) return fallback;
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj) ?? fallback;
}

function setByPathMutable(obj: any, path: string, value: any) {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
  return obj;
}

/** --------- context types --------- */
type Ctx = {
  settings: Settings | null;
  /** 覆盖整个设置对象（通常用不到） */
  setAll(next: Settings): void;
  /** 按路径设置（会持久化到主进程） */
  setByPath(path: string, value: any): Promise<void>;
  /** 局部 patch（会持久化到主进程） */
  patch(partial: Partial<Settings>): Promise<void>;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  // 首次加载
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await configContext.getAll();
        if (cancelled) return;
        setSettings(all);
        applyAllSettings(all); // ✅ 启动即应用主题/皮肤等
      } catch (e) {
        console.error('[SettingsProvider] getAll failed:', e);
      }
    })();
    // 订阅主进程广播
    const unsub = configContext.subscribe((s) => {
      setSettings(s);
      applyAllSettings(s); // ✅ 任意设置变更→全局立即应用
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const setAll = useCallback((next: Settings) => {
    setSettings(next);
    applyAllSettings(next);
  }, []);

  const setByPath = useCallback(async (path: string, value: any) => {
    // 本地乐观更新
    setSettings((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      setByPathMutable(next, path, value);
      return next;
    });
    // 持久化到主进程（主进程会再广播一次最终状态覆盖回来）
    try {
      await configContext.setByPath(path, value);
    } catch (e) {
      console.error('[SettingsProvider] setByPath failed:', path, e);
    }
  }, []);

  const patch = useCallback(async (partial: Partial<Settings>) => {
    // 本地乐观更新
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
    try {
      await configContext.patch(partial);
    } catch (e) {
      console.error('[SettingsProvider] patch failed:', e);
    }
  }, []);

  const value = useMemo<Ctx>(() => ({ settings, setAll, setByPath, patch }), [settings, setAll, setByPath, patch]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

/** 读取完整 Settings（可能为 null，注意判空） */
export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

/** 读取单个设置项（返回 { value, setValue }） */
export function useSetting<T = any>(path: string, fallback: T) {
  const { settings, setByPath } = useSettings();
  const value = useMemo(() => getByPath(settings, path, fallback) as T, [settings, path, fallback]);
  const setValue = useCallback((v: T) => setByPath(path, v), [path, setByPath]);
  return { value, setValue } as const;
}