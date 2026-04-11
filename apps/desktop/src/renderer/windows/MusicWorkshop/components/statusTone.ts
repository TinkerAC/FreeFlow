import type styles from '../MusicWorkshop.module.css';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

export function statusToneClass(
  tone: StatusTone,
  css: typeof styles,
) {
  switch (tone) {
    case 'success':
      return css.statusSuccess;
    case 'warning':
      return css.statusWarning;
    case 'danger':
      return css.statusDanger;
    default:
      return css.statusNeutral;
  }
}
