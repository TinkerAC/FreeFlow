import React from 'react';

export default function Segmented<T extends string>({
                                                      value, onChange, options,
                                                    }: { value:T; onChange:(v:T)=>void; options:{label:string; value:T}[] }) {
  return (
    <div
      style={{
        display: 'inline-flex', borderRadius: 999,
        border: '1px solid rgb(var(--md-sys-color-outline-variant))',
        background: 'rgba(var(--md-sys-color-surface-variant), .6)',
        padding: 2, gap: 2,
      }}
      role="tablist"
    >
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={()=>onChange(o.value)}
            style={{
              height: 28, padding: '0 12px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: active ? 'rgb(var(--md-sys-color-primary))' : 'transparent',
              color: active ? 'rgb(var(--md-sys-color-on-primary))' : 'rgb(var(--md-sys-color-on-surface))',
              fontWeight: 700,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}