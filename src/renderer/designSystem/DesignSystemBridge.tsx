import React, { useMemo } from 'react';
import { DesignSystemProvider } from './SkinSystem';
import { useSetting } from '@components/Maincontent/SettingView/useSettings';

/** 把 Settings 里的选择 -> 映射到各家族默认皮肤 */
export default function DesignSystemBridge({ children }: { children: React.ReactNode }) {
  // 路径要和 zod schema 对齐
  const progress = useSetting<'classic' | 'neon' | 'waveform' | 'knob'>('audio.progressSkin', 'classic');
  // 未来扩展：const button = useSetting<'filled'|'ghost'>('ui.skins.button', 'filled');
  //           const tabs   = useSetting<'underline'|'pill'>('ui.skins.tabs', 'underline');

  const defaults = useMemo(() => ({
    progress: progress.value,
    // button: button.value,
    // tabs: tabs.value,
  }), [progress.value /*, button.value, tabs.value */]);

  return <DesignSystemProvider defaults={defaults}>{children}
  </DesignSystemProvider>;
}