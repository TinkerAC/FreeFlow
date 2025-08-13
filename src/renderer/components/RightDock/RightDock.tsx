import React from 'react';

export default function RightDock({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        background: 'rgb(var(--md-sys-color-surface-container-low))', // ✅ 用主题变量
        borderLeft: '1px solid rgb(var(--md-sys-color-outline-variant))',
        boxShadow: '0 10px 30px rgba(0,0,0,.25)',
        overflow: 'hidden',
      }}
    >
      {children ?? null}
    </div>
  );
}