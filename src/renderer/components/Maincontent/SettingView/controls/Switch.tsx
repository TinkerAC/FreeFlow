import React from 'react';

const sw = {
  root: 'inline-flex items-center cursor-pointer select-none',
  track: 'relative w-11 h-6 rounded-full transition-colors',
  knob: 'absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform',
};

export default function Switch({
                                 checked, onChange, disabled, label,
                               }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={sw.root}
      title={label}
      style={{ gap: 8 }}
    >
      <span
        className={sw.track}
        style={{
          background: checked
            ? `rgb(var(--md-sys-color-primary))`
            : `rgb(var(--md-sys-color-surface-variant))`,
          opacity: disabled ? .5 : 1,
        }}
      >
        <span
          className={sw.knob}
          style={{
            background: checked
              ? `rgb(var(--md-sys-color-on-primary))`
              : `rgb(var(--md-sys-color-on-surface))`,
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}