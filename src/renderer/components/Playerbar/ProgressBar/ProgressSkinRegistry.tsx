// file: src/renderer/components/Playerbar/ProgressBar/ProgressSkinRegistry.tsx
import React, { createContext, useContext } from 'react';
import type { ClassicBarProps } from './skins/Classic/ClassicBar';
import type { NeonBarProps } from './skins/Neon/NeonBar';
import type { WaveformBarProps } from './skins/Waveform/WaveformBar';
import type { KnobProps } from './skins/Knob/Knob';

export type SkinName = 'classic' | 'neon' | 'waveform' | 'knob';

type AnySkinProps = ClassicBarProps & NeonBarProps & WaveformBarProps & KnobProps;
type SkinComponent = React.FC<any>;

const REG: Record<SkinName, SkinComponent> = {} as any;

export function registerProgressSkin(name: SkinName, comp: SkinComponent) {
  REG[name] = comp;
}

/* 允许全局设置默认皮肤，也可以每处单独传 */
const Ctx = createContext<SkinName>('classic');
export const ProgressSkinProvider = Ctx.Provider;
export const useDefaultSkin = () => useContext(Ctx);

/** 统一入口：根据 skin 渲染对应实现 */
export function ProgressBar(props: AnySkinProps & { skin?: SkinName; styleVars?: React.CSSProperties }) {
  const def = useDefaultSkin();
  const skin = props.skin ?? def;
  const Comp = REG[skin];
  if (!Comp) return null;
  return <div style={props.styleVars as React.CSSProperties}><Comp {...props} /></div>;
}
