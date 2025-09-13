// file: src/renderer/theme/presets.ts

// 集中管理预设主题的种子色。渲染时使用 Material You 根据 seed 生成整套 token。
export const PRESET_SEEDS = {
  // legacy/basic
  classic: '#6750A4',
  spotify: '#1DB954',
  netease: '#E71F19',

  // palette from daily suggestion
  indigo: '#6750A4',
  blue: '#1E88E5',
  cyan: '#00ACC1',
  green: '#43A047',
  lime: '#7CB342',
  amber: '#FBC02D',
  orange: '#FB8C00',
  red: '#E53935',
  pink: '#D81B60',
  purple: '#8E24AA',
  deepPurple: '#5E35B1',
  indigoDeep: '#3949AB',
  lightBlue: '#039BE5',
  teal: '#00897B',
  lightGreen: '#7CB342',
  limeDeep: '#C0CA33',
  yellow: '#FDD835',
  amberDeep: '#FFB300',
  deepOrange: '#F4511E',
  brown: '#6D4C41',
  blueGrey: '#546E7A',
} as const;

export type PresetName = keyof typeof PRESET_SEEDS;
