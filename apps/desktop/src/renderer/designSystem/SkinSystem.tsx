import React, { createContext, useContext, useMemo } from 'react';

/** 你要支持的“皮肤家族” */
export type SkinFamily = 'progress' | 'button' | 'switch' | 'slider' | 'tabs';

/** 每个家族下：皮肤名 -> 组件实现 */
export type SkinComponent = React.FC<any>;
export type FamilyRegistry = Record<string, SkinComponent>;
type Registry = Partial<Record<SkinFamily, FamilyRegistry>>;

/** 全局注册表（模块级，所有 register* 都往这里塞） */
const baseRegistry: Registry = {};

/** 登记一个家族的一批皮肤 */
export function registerFamily(family: SkinFamily, map: FamilyRegistry) {
  baseRegistry[family] = { ...(baseRegistry[family] || {}), ...map };
}

/** Provider 提供默认皮肤名映射（来自 Settings） */
type Defaults = Partial<Record<SkinFamily, string>>;
const SkinsCtx = createContext<{ registry: Registry; defaults: Defaults }>({ registry: {}, defaults: {} });

export function DesignSystemProvider({ defaults, children }: { defaults: Defaults; children: React.ReactNode }) {
  // registry 是模块常量；defaults 可能随设置热更新
  const value = useMemo(() => ({ registry: baseRegistry, defaults }), [defaults]);
  return <SkinsCtx.Provider value={value}>{children}</SkinsCtx.Provider>;
}

/** 取当前家族的“已选择皮肤实现”（优先：prop.skin > defaults > 第一个注册的皮肤） */
export function useSkin<TProps = any>(family: SkinFamily, overrideSkin?: string): React.FC<TProps> {
  const { registry, defaults } = useContext(SkinsCtx);
  const fam = registry[family] || {};
  const names = Object.keys(fam);
  const chosen = overrideSkin ?? defaults[family] ?? names[0];
  const Comp = fam[chosen];
  if (!Comp) {
    // 没有注册任何皮肤时兜底，返回空组件避免崩
    // @ts-ignore
    return ((_: TProps) => null) as any;
  }
  return Comp as unknown as React.FC<TProps>;
}

/** 通用渲染器：不同家族的组件都可用它来渲染 */
export function Skinned(props: { of: SkinFamily; skin?: string } & Record<string, any>) {
  const { of, skin, ...rest } = props;
  const Comp = useSkin(of, skin);
  return <Comp {...rest} />;
}