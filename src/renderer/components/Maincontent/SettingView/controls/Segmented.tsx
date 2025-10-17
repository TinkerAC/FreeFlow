import React from 'react';

export default function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    const updateIndicator = () => {
      if (!containerRef.current) return;
      const activeIndex = options.findIndex(opt => opt.value === value);
      const buttons = containerRef.current.querySelectorAll('button');
      const activeButton = buttons[activeIndex];
      if (activeButton) {
        setIndicatorStyle({
          left: activeButton.offsetLeft,
          width: activeButton.offsetWidth,
        });
        // 第一次渲染后标记为 false
        isFirstRender.current = false;
      }
    };
    updateIndicator();
    // 延迟一帧确保 DOM 已渲染
    requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        borderRadius: 999,
        border: '1px solid rgb(var(--md-sys-color-outline-variant))',
        background: 'rgba(var(--md-sys-color-surface-variant), .35)',
      }}
    >
      {/* 滑动指示器 */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          height: 'calc(100% - 4px)',
          borderRadius: 999,
          background: 'rgb(var(--md-sys-color-primary))',
          transition: isFirstRender.current ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* 选项按钮 */}
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              height: 28,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 700,
              color: isActive
                ? 'rgb(var(--md-sys-color-on-primary))'
                : 'rgb(var(--md-sys-color-on-surface))',
              background: 'transparent',
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}