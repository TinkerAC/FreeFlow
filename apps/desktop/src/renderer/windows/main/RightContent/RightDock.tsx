// file: src/renderer/components/RightDock/RightDock.tsx
import React from 'react';

export default function RightDock({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        background: 'rgb(var(--md-sys-color-surface-container-low))',
        color: 'rgb(var(--md-sys-color-on-surface))',
        borderLeft: '1px solid rgb(var(--md-sys-color-outline-variant))',
        boxShadow: '0 10px 30px rgba(0,0,0,.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',   // 由内部的 PlayQueue.body 滚动
      }}
    >
      {children ?? null}
    </div>
  );
}