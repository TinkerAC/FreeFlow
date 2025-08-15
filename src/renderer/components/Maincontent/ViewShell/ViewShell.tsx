import React, { forwardRef } from 'react';
import clsx from 'clsx';
import styles from './ViewShell.module.css';

export interface ViewShellProps {
  header?: React.ReactNode;
  /** 固定在内容下方的背景层（不随滚动移动） */
  background?: React.ReactNode;
  children: React.ReactNode;
  /** 内容区是否加默认内边距 */
  padded?: boolean;
  /** 隐藏滚动条但保留滚动能力 */
  hideScrollbar?: boolean;
  className?: string;      // 可覆盖 root
  contentClassName?: string; // 可覆盖 scroll 容器
}

/**
 * 统一的视图外壳：头部不滚动 + 唯一滚动区（forwardRef 暴露滚动容器）
 */
const ViewShell = forwardRef<HTMLDivElement, ViewShellProps>(function ViewShell(
  { header, background, children, padded = true, hideScrollbar = false, className, contentClassName },
  ref,
) {
  return (
    <div className={clsx(styles.root, className)}>
      {background && <div className={styles.bg}>{background}</div>}
      {header && <div className={styles.header}>{header}</div>}
      <div
        ref={ref}
        className={clsx(
          styles.scroll,
          hideScrollbar && styles.scrollHidden,
          padded && styles.scrollPadded,
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
});

export default ViewShell;