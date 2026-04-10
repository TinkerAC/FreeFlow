// file: src/renderer/theme/materialYou.ts
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

export type Mode = 'light' | 'dark';

const toTriplet = (argb: number) =>
  `${(argb >> 16) & 255} ${(argb >> 8) & 255} ${argb & 255}`;

export function applyMaterialYou(seedHex: string, mode: Mode, target: HTMLElement = document.documentElement) {
  if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(seedHex)) throw new Error(`Invalid seed: ${seedHex}`);

  const theme = themeFromSourceColor(argbFromHex(seedHex));
  const scheme = mode === 'dark' ? theme.schemes.dark : theme.schemes.light;
  const s = scheme.toJSON();

  // 把 scheme 的角色色写进 CSS 变量（全部写三通道）
  const set = (k: string, v: number) => target.style.setProperty(k, toTriplet(v));

  // Primary
  set('--md-sys-color-primary', s.primary);
  set('--md-sys-color-on-primary', s.onPrimary);
  set('--md-sys-color-primary-container', s.primaryContainer);
  set('--md-sys-color-on-primary-container', s.onPrimaryContainer);

  // Secondary
  set('--md-sys-color-secondary', s.secondary);
  set('--md-sys-color-on-secondary', s.onSecondary);
  set('--md-sys-color-secondary-container', s.secondaryContainer);
  set('--md-sys-color-on-secondary-container', s.onSecondaryContainer);

  // Tertiary
  set('--md-sys-color-tertiary', s.tertiary);
  set('--md-sys-color-on-tertiary', s.onTertiary);
  set('--md-sys-color-tertiary-container', s.tertiaryContainer);
  set('--md-sys-color-on-tertiary-container', s.onTertiaryContainer);

  // Error
  set('--md-sys-color-error', s.error);
  set('--md-sys-color-on-error', s.onError);
  set('--md-sys-color-error-container', s.errorContainer);
  set('--md-sys-color-on-error-container', s.onErrorContainer);

  // Background
  set('--md-sys-color-background', s.background);
  set('--md-sys-color-on-background', s.onBackground);

  // Surface
  set('--md-sys-color-surface', s.surface);
  set('--md-sys-color-on-surface', s.onSurface);
  set('--md-sys-color-surface-variant', s.surfaceVariant);
  set('--md-sys-color-on-surface-variant', s.onSurfaceVariant);

  // Outline
  set('--md-sys-color-outline', s.outline);
  set('--md-sys-color-outline-variant', s.outlineVariant);

  // Inverse
  set('--md-sys-color-inverse-surface', s.inverseSurface);
  set('--md-sys-color-inverse-on-surface', s.inverseOnSurface);
  set('--md-sys-color-inverse-primary', s.inversePrimary);

  // Shadow & Scrim
  set('--md-sys-color-shadow', s.shadow);
  set('--md-sys-color-scrim', s.scrim);

  // Surface 容器层级（手动生成，因为 0.3.0 版本不提供）
  // 使用 neutral palette 的不同 tone 来创建层级
  const neutralPalette = theme.palettes.neutral;

  if (mode === 'dark') {
    // Dark mode: 拉开 tone 间距，避免 surface 与 low/container 在量化后撞色
    set('--md-sys-color-surface-dim', neutralPalette.tone(4));
    set('--md-sys-color-surface-bright', neutralPalette.tone(26));
    set('--md-sys-color-surface-container-lowest', neutralPalette.tone(6));
    set('--md-sys-color-surface-container-low', neutralPalette.tone(12));
    set('--md-sys-color-surface-container', neutralPalette.tone(16));
    set('--md-sys-color-surface-container-high', neutralPalette.tone(20));
    set('--md-sys-color-surface-container-highest', neutralPalette.tone(24));
  } else {
    // Light mode: 使用更清晰的层级，避免 background/surface/low 过于接近
    set('--md-sys-color-surface-dim', neutralPalette.tone(87));
    set('--md-sys-color-surface-bright', neutralPalette.tone(98));
    set('--md-sys-color-surface-container-lowest', neutralPalette.tone(100));
    set('--md-sys-color-surface-container-low', neutralPalette.tone(97));
    set('--md-sys-color-surface-container', neutralPalette.tone(94));
    set('--md-sys-color-surface-container-high', neutralPalette.tone(92));
    set('--md-sys-color-surface-container-highest', neutralPalette.tone(90));
  }

  target.setAttribute('data-brand', 'material');
  target.setAttribute('data-theme', mode);
}
