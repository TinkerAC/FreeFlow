/**
 * NavigationContext - 基于 React Context 的现代导航系统
 *
 * 特性：
 * - 使用 React Context API，无需手动传递 props
 * - 支持浏览器式前进/后退
 * - 类型安全的导航参数
 * - 可持久化历史记录
 * - 支持历史记录拦截和监听
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ==================== 类型定义 ====================

export enum ViewType {
  PLAYLIST = 'playlist',
  SEARCH_RESULTS = 'searchResults',
  PROFILE = 'profile',
  LYRIC = 'lyric',
  DEBUG = 'debug',
  SETTINGS = 'settings',
  TRACK_DETAIL = 'trackDetail',
  FREEFLOW_TRACK_DETAIL = 'freeflowTrackDetail',
  WEB3 = 'web3',
}

export interface NavigationEntry<TData = any> {
  id: string;                    // 唯一标识
  view: ViewType;                // 视图类型
  data?: TData;                  // 视图数据（如 TrackEntity）
  timestamp: number;             // 导航时间戳
  title?: string;                // 可选的标题（用于显示）
}

export interface NavigationState {
  entries: NavigationEntry[];    // 历史记录栈
  currentIndex: number;          // 当前位置索引
}

export interface NavigationContextValue {
  // 当前状态
  currentEntry: NavigationEntry | null;
  canGoBack: boolean;
  canGoForward: boolean;

  // 导航方法
  push: <TData = any>(view: ViewType, data?: TData, title?: string) => void;
  replace: <TData = any>(view: ViewType, data?: TData, title?: string) => void;
  goBack: () => void;
  goForward: () => void;
  go: (delta: number) => void;

  // 历史记录
  history: NavigationEntry[];
  currentIndex: number;

  // 工具方法
  clear: () => void;
}

// ==================== Context 创建 ====================

const NavigationContext = createContext<NavigationContextValue | null>(null);

// ==================== Provider 实现 ====================

interface NavigationProviderProps {
  children: React.ReactNode;
  initialView: ViewType;
  persistKey?: string;  // localStorage 持久化 key
}

export function NavigationProvider({
                                     children,
                                     initialView,
                                     persistKey = 'app-navigation-history',
                                   }: NavigationProviderProps) {

  // 生成唯一 ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 初始化状态（支持从 localStorage 恢复）
  const getInitialState = (): NavigationState => {
    if (persistKey) {
      try {
        const saved = localStorage.getItem(persistKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // 验证数据结构
          if (parsed.entries && Array.isArray(parsed.entries) && typeof parsed.currentIndex === 'number') {
            return parsed;
          }
        }
      } catch (error) {
        console.warn('Failed to restore navigation state:', error);
      }
    }

    // 默认初始状态
    return {
      entries: [{
        id: generateId(),
        view: initialView,
        timestamp: Date.now(),
      }],
      currentIndex: 0,
    };
  };

  const [state, setState] = useState<NavigationState>(getInitialState);

  // 持久化到 localStorage
  useEffect(() => {
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to persist navigation state:', error);
      }
    }
  }, [state, persistKey]);

  // 计算派生状态
  const currentEntry = state.entries[state.currentIndex] || null;
  const canGoBack = state.currentIndex > 0;
  const canGoForward = state.currentIndex < state.entries.length - 1;

  // Push: 添加新条目（清除前进历史）
  const push = useCallback(<TData = any>(view: ViewType, data?: TData, title?: string) => {
    setState(prev => {
      // 检查是否与当前视图相同（避免重复添加）
      const current = prev.entries[prev.currentIndex];
      if (current && current.view === view &&
        JSON.stringify(current.data) === JSON.stringify(data)) {
        return prev; // 相同视图，不添加
      }

      const newEntry: NavigationEntry = {
        id: generateId(),
        view,
        data,
        title,
        timestamp: Date.now(),
      };

      // 截断当前位置之后的历史
      const newEntries = [...prev.entries.slice(0, prev.currentIndex + 1), newEntry];

      return {
        entries: newEntries,
        currentIndex: newEntries.length - 1,
      };
    });
  }, []);

  // Replace: 替换当前条目
  const replace = useCallback(<TData = any>(view: ViewType, data?: TData, title?: string) => {
    setState(prev => {
      const newEntry: NavigationEntry = {
        id: generateId(),
        view,
        data,
        title,
        timestamp: Date.now(),
      };

      const newEntries = [...prev.entries];
      newEntries[prev.currentIndex] = newEntry;

      return {
        entries: newEntries,
        currentIndex: prev.currentIndex,
      };
    });
  }, []);

  // GoBack: 后退
  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex > 0) {
        return {
          ...prev,
          currentIndex: prev.currentIndex - 1,
        };
      }
      return prev;
    });
  }, []);

  // GoForward: 前进
  const goForward = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex < prev.entries.length - 1) {
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
        };
      }
      return prev;
    });
  }, []);

  // Go: 相对跳转
  const go = useCallback((delta: number) => {
    setState(prev => {
      const newIndex = prev.currentIndex + delta;
      if (newIndex >= 0 && newIndex < prev.entries.length) {
        return {
          ...prev,
          currentIndex: newIndex,
        };
      }
      return prev;
    });
  }, []);

  // Clear: 清除历史（重置到初始状态）
  const clear = useCallback(() => {
    setState({
      entries: [{
        id: generateId(),
        view: initialView,
        timestamp: Date.now(),
      }],
      currentIndex: 0,
    });
  }, [initialView]);

  const value = useMemo<NavigationContextValue>(() => ({
    currentEntry,
    canGoBack,
    canGoForward,
    push,
    replace,
    goBack,
    goForward,
    go,
    history: state.entries,
    currentIndex: state.currentIndex,
    clear,
  }), [
    currentEntry,
    canGoBack,
    canGoForward,
    push,
    replace,
    goBack,
    goForward,
    go,
    state.entries,
    state.currentIndex,
    clear,
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// ==================== Hook ====================

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

// ==================== 导出兼容类型（用于迁移） ====================

export type View = ViewType;
export const View = ViewType;

export interface StackItem extends NavigationEntry {
}
