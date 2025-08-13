import React from 'react';

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
};

export default function Select<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        height: 28,
        borderRadius: 999,
        background: 'rgba(var(--md-sys-color-surface-variant), .35)',
        border: '1px solid rgb(var(--md-sys-color-outline-variant))',
        color: 'rgb(var(--md-sys-color-on-surface))',
        padding: '0 10px',
      }}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}