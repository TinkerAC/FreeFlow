// file: src/renderer/components/ContentPanel/ContentPanel.tsx
import React, { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export default function ContentPanel({ children, className = '' }: PanelProps) {
  return (
    <div
      className={`bg-[#121212] text-white rounded-lg  overflow-auto ${className} no-scrollbar`}
    >
      {children}
    </div>
  );
}