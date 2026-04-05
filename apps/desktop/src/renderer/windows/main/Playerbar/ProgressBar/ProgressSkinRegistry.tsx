import React, { createContext, useContext } from 'react';

export type SkinName = 'classic' | 'neon' | 'waveform' | 'knob';

// 统一用 any；各皮肤自己在实现处做类型约束即可
type SkinComponent = React.FC<any>;
const REG: Record<SkinName, SkinComponent> = {} as any;

export function registerProgressSkin(name: SkinName, comp: SkinComponent) {
  REG[name] = comp;
}

/* 全局默认皮肤（可用 Provider 改） */
const Ctx = createContext<SkinName>('classic');
export const ProgressSkinProvider = Ctx.Provider;
export const useDefaultSkin = () => useContext(Ctx);

/** 统一入口：根据 skin 渲染对应实现；中间层不参与布局、不抢宽度 */
export function ProgressBar(props: any) {
  const { skin: skinProp, styleVars, ...rest } = props;
  const def = useDefaultSkin();
  const skin = skinProp ?? def;
  // @ts-ignore
  const Comp = REG[skin];
  if (!Comp) return null;

  // 中间层只负责承载 CSS 变量；用 display: contents 避免破坏 Flex/Grid 布局
  return (
    <div style={{ display: 'contents', ...(styleVars as React.CSSProperties) }}>
      <Comp {...rest} />
    </div>
  );
}