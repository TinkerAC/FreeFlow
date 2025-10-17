import React from 'react';
import styles from './ColorSeed.module.css'; // 可选

type Props = {
  hex: string;
  onChange: (hex: string) => void;
};

/** 受控版本：完全由 props 驱动，不保留内部状态 */
export default function ColorSeed({ hex, onChange }: Props) {
  return (
    <div className={styles?.root ?? undefined}>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        title={hex}
        style={{
          width: 36,
          height: 24,
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,.15)',
          background: 'transparent',
        }}
      />
      <span style={{
        marginLeft: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas',
        opacity: .85,
      }}>{hex}</span>
    </div>
  );
}