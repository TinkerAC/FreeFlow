import React from 'react';
import { motion } from 'framer-motion';
import RightContent, { RightContentProps } from './RightContent';

interface RightDrawerProps extends RightContentProps {
  /** 抽屉是否可见 */
  visible: boolean;
}

const DRAWER_WIDTH = 300;                 // 统一管理宽度
const TRANSITION = { duration: 0.3, ease: 'easeInOut' };

/**
 * 右侧抽屉（挂载级动效 & 内存友好）
 */
export default function RightDrawer({
                                      visible,
                                      ...rightContentProps
                                    }: RightDrawerProps) {
  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={visible ? { width: DRAWER_WIDTH, opacity: 1 } : { width: 0, opacity: 0 }}
      transition={TRANSITION}
      className="fixed top-16 right-0 bottom-0 bg-neutral-900/90 backdrop-blur
                 border-l border-neutral-800 overflow-y-auto z-30
                 shadow-lg"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      {/* 仅可见时才真正渲染内容，节省性能 */}
      {visible && <RightContent {...rightContentProps} />}
    </motion.aside>
  );
}