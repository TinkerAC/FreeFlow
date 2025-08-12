// file: src/renderer/theme/presets.ts

import { applyMaterialYou, Mode } from '@renderer/theme/MaterialYou';

export const BRAND_PRESETS: Record<string, { seed: string; mode: Mode }> = {
  spotify: { seed: '#1DB954', mode: 'dark'  }, // 绿+暗
  netease: { seed: '#E71F19', mode: 'light' }, // 红+浅
  // 你也可以加：apple: '#0a84ff', adobe: '#ff0000' ...
};

export function applyBrandPreset(name: keyof typeof BRAND_PRESETS) {
  const p = BRAND_PRESETS[name];
  applyMaterialYou(p.seed, p.mode);
}
