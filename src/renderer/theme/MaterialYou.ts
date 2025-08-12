// file: src/renderer/theme/materialYou.ts
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

export type Mode = 'light' | 'dark';

const toTriplet = (argb: number) =>
  `${(argb >> 16) & 255} ${(argb >> 8) & 255} ${argb & 255}`;

export function applyMaterialYou(seedHex: string, mode: Mode, target: HTMLElement = document.documentElement) {
  if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(seedHex)) throw new Error(`Invalid seed: ${seedHex}`);

  const theme = themeFromSourceColor(argbFromHex(seedHex));
  const s: any = mode === 'dark' ? theme.schemes.dark : theme.schemes.light;

  // 把 scheme 的角色色写进 CSS 变量（全部写三通道）
  const set = (k: string, v: number) => target.style.setProperty(k, toTriplet(v));

  set('--md-sys-color-primary', s.primary);
  set('--md-sys-color-on-primary', s.onPrimary);
  set('--md-sys-color-primary-container', s.primaryContainer);
  set('--md-sys-color-on-primary-container', s.onPrimaryContainer);

  set('--md-sys-color-secondary', s.secondary);
  set('--md-sys-color-on-secondary', s.onSecondary);
  set('--md-sys-color-secondary-container', s.secondaryContainer);
  set('--md-sys-color-on-secondary-container', s.onSecondaryContainer);

  set('--md-sys-color-tertiary', s.tertiary);
  set('--md-sys-color-on-tertiary', s.onTertiary);
  set('--md-sys-color-tertiary-container', s.tertiaryContainer);
  set('--md-sys-color-on-tertiary-container', s.onTertiaryContainer);

  set('--md-sys-color-error', s.error);
  set('--md-sys-color-on-error', s.onError);
  set('--md-sys-color-error-container', s.errorContainer);
  set('--md-sys-color-on-error-container', s.onErrorContainer);

  set('--md-sys-color-background', s.background);
  set('--md-sys-color-on-background', s.onBackground);

  set('--md-sys-color-surface', s.surface);
  set('--md-sys-color-on-surface', s.onSurface);
  set('--md-sys-color-surface-variant', s.surfaceVariant);
  set('--md-sys-color-on-surface-variant', s.onSurfaceVariant);

  set('--md-sys-color-outline', s.outline);
  set('--md-sys-color-outline-variant', s.outlineVariant ?? s.outline);

  set('--md-sys-color-inverse-surface', s.inverseSurface);
  set('--md-sys-color-inverse-on-surface', s.inverseOnSurface);
  set('--md-sys-color-inverse-primary', s.inversePrimary);

  // 容器层级（不同版本命名略差异，做多重兜底）
  set('--md-sys-color-surface-dim', s.surfaceDim ?? s.surface);
  set('--md-sys-color-surface-bright', s.surfaceBright ?? s.surface);
  set('--md-sys-color-surface-container-lowest', s.surfaceContainerLowest ?? s.surface);
  set('--md-sys-color-surface-container-low', s.surfaceContainerLow ?? s.surface);
  set('--md-sys-color-surface-container', s.surfaceContainer ?? s.surface);
  set('--md-sys-color-surface-container-high', s.surfaceContainerHigh ?? s.surface);
  set('--md-sys-color-surface-container-highest', s.surfaceContainerHighest ?? s.surface);

  target.setAttribute('data-brand', 'material');
  target.setAttribute('data-theme', mode);
}
