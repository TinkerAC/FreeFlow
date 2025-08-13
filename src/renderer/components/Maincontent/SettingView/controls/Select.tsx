import React from 'react';

export default function Select<T extends string>({
                                                   value, onChange, options, width = 220,
                                                 }: { value: T; onChange: (v:T)=>void; options: {label:string; value:T}[]; width?: number }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        width,
        height: 32,
        borderRadius: 999,
        background: 'rgba(var(--md-sys-color-surface-variant), .6)',
        border: '1px solid rgb(var(--md-sys-color-outline-variant))',
        color: 'rgb(var(--md-sys-color-on-surface))',
        padding: '0 12px',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}