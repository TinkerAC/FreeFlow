import React from 'react';

export default function RightDock({ children }:{ children?: React.ReactNode }) {
  // 占满第三列（由 ContentGrid 控制宽度 0/320）
  return (
    <div style={{
      height: '100%',
      background: 'rgb(24 24 27)',
      borderLeft: '1px solid rgb(63 63 70)',
      boxShadow: '0 10px 30px rgba(0,0,0,.45)',
      overflow: 'hidden',
    }}>
      {children ?? null}
    </div>
  );
}
