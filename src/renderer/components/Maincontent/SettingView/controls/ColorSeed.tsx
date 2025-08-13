import React, { useId, useState } from 'react';


export default function ColorSeed({
                                    hex, onChange,
                                  }: { hex: string; onChange: (hex:string)=>void }) {
  const id = useId();
  const [val, setVal] = useState(hex);

  const update = (next:string) => {
    setVal(next);
    if (/^#([0-9a-fA-F]{6})$/.test(next)) onChange(next.toUpperCase());
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <input
        id={id}
        type="color"
        value={val}
        onChange={(e)=>update(e.target.value)}
        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgb(var(--md-sys-color-outline-variant))', padding: 0 }}
        title="选择种子色"
      />
      <input
        value={val}
        onChange={(e)=>update(e.target.value)}
        placeholder="#RRGGBB"
        style={{
          height: 32, width: 120, borderRadius: 8,
          background: 'rgba(var(--md-sys-color-surface-variant), .6)',
          border: '1px solid rgb(var(--md-sys-color-outline-variant))',
          color: 'rgb(var(--md-sys-color-on-surface))',
          padding: '0 8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      />
    </div>
  );
}