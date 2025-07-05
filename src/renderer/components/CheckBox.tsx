import React, { forwardRef } from "react";
import { Check } from "lucide-react";

/** Tailwind classname helper (tiny replacement for clsx/classnames) */
function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------
 * 1. Checkbox  受控组件，可在 Tailwind / Shadcn 风格项目中直接使用
 * ----------------------------------------------------------------*/
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  /** 切换回调，布尔值代表当前状态 */
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, className, ...rest }, ref) => {
    return (
      <label
        className={cn(
        "relative inline-flex h-5 w-5 items-center justify-center cursor-pointer select-none",
        className,
    )}
  >
    <input
      ref={ref}
    type="checkbox"
    className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-transparent checked:border-indigo-600 checked:bg-indigo-600 focus:ring-0 focus:outline-none transition-colors"
    checked={checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...rest}
    />
    {/* 图标 */}
    <Check className="pointer-events-none h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
      </label>
  );
  },
);
Checkbox.displayName = "Checkbox";

/* ------------------------------------------------------------------
 * 2. ScrollArea  简易滚动区域包装，提供可定制 viewportClassName
 * ----------------------------------------------------------------*/
export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 作用于内部可滚动容器的额外类名 */
  viewportClassName?: string;
}

/**
 * ScrollArea 把 children 放进内部可滚动 div 中，外层可用于定位滚动条轨道。
 *  - 默认隐藏系统滚动条（Tailwind 的 no-scrollbar 工具类生效）
 *  - 允许通过 viewportClassName / className 进一步自定义
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, viewportClassName, children, ...rest }, ref) => (
    <div
      ref={ref}
className={cn(
  "relative h-full w-full overflow-hidden",
  className,
)}
{...rest}
>
<div
  className={cn(
  "h-full w-full overflow-y-auto no-scrollbar",
  viewportClassName,
)}
>
{children}
</div>
</div>
),
);
ScrollArea.displayName = "ScrollArea";

/* ------------------------------------------------------------------
 * 导出工具函数，方便外部使用
 * ----------------------------------------------------------------*/
export const UI = { Checkbox, ScrollArea };
