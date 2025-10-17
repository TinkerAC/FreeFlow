import React from 'react';

export default function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
        userSelect: 'none',
      }}
      title={label}
    >
      {/* Track */}
      <span
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked
            ? 'rgb(var(--md-sys-color-primary))'
            : 'rgb(var(--md-sys-color-surface-variant))',
          opacity: disabled ? 0.5 : 1,
          transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Knob */}
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: checked
              ? 'rgb(var(--md-sys-color-on-primary))'
              : 'rgb(var(--md-sys-color-on-surface-variant))',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </span>
      
      {label && (
        <span
          style={{
            fontSize: 14,
            color: 'rgb(var(--md-sys-color-on-surface))',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}