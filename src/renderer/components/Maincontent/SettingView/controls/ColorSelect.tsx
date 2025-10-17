import React from 'react';
import ReactDOM from 'react-dom';

export type ColorOption = { label: string; hex: string };

export default function ColorSelect({
                                      value,
                                      options,
                                      onChange,
                                    }: { value: string; options: ColorOption[]; onChange: (hex: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const current = options.find(o => o.hex.toLowerCase() === (value || '').toLowerCase()) || {
    label: value || '#000000',
    hex: value || '#000000',
  };

  // 关闭逻辑 + 定位
  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }

    function onWinBlur() {
      setOpen(false);
    }

    function onScroll() {
      if (open) recalcPos();
    }

    function onResize() {
      if (open) recalcPos();
    }

    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('blur', onWinBlur);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('blur', onWinBlur);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const recalcPos = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const btn = el.querySelector('button');
    if (!btn) return;
    const r = (btn as HTMLButtonElement).getBoundingClientRect();
    setMenuPos({ top: Math.round(r.bottom + 6), left: Math.round(r.left), width: Math.max(220, Math.round(r.width)) });
  }, []);

  React.useEffect(() => {
    if (open) recalcPos();
  }, [open, recalcPos]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          height: 28,
          borderRadius: 999,
          background: 'rgba(var(--md-sys-color-surface-variant), .35)',
          border: '1px solid rgb(var(--md-sys-color-outline-variant))',
          color: 'rgb(var(--md-sys-color-on-surface))',
          padding: '0 10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
        title={`${current.label}`}
      >
        <span
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            background: current.hex,
            border: '1px solid rgba(0,0,0,.25)',
          }}
        />
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current.label}
        </span>
      </button>

      {open && menuPos && ReactDOM.createPortal(
        (
          <div
            style={{
              position: 'fixed', zIndex: 9999, top: menuPos.top, left: menuPos.left, width: menuPos.width,
              background: 'rgb(var(--md-sys-color-surface))',
              color: 'rgb(var(--md-sys-color-on-surface))',
              border: '1px solid rgb(var(--md-sys-color-outline-variant))',
              borderRadius: 8,
              boxShadow: '0 10px 24px rgba(0,0,0,.25)',
              padding: 6,
              maxHeight: 260,
              overflowY: 'auto',
            }}
            role="listbox"
          >
            {options.map(opt => (
              <button
                key={`${opt.label}-${opt.hex}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.hex);
                  setOpen(false);
                }}
                role="option"
                aria-selected={opt.hex.toLowerCase() === (value || '').toLowerCase()}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent',
                  border: 0,
                  padding: '6px 8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 6,
                }}
                title={opt.label}
              >
                <span aria-hidden style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: opt.hex,
                  border: '1px solid rgba(0,0,0,.25)',
                }} />
                <span style={{ flex: 1 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        ),
        document.body,
      )}
    </div>
  );
}
