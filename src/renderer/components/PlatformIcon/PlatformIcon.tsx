import React from 'react';
import { Bilibili, Hifini, NetEaseCloudMusic, QQMusic, YouTubeMusic } from '@components/static';
import styles from './PlatformIcon.module.css';

type PlatformType = 'NetEaseCloudMusic' | 'Hifini' | 'QQMusic' | 'Bilibili' | 'YouTubeMusic' | string;

interface PlatformIconProps {
  platform: PlatformType;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  /** 是否启用悬停效果，默认 false */
  hover?: boolean;
}

/**
 * 平台图标组件 - 统一渲染各音乐平台的图标
 * @param platform - 平台名称
 * @param size - 图标大小，可以是数字（像素）或字符串（如 '18px'），默认 18
 * @param className - 自定义样式类
 * @param style - 自定义内联样式
 * @param title - 悬停提示文本，默认为平台名称
 * @param hover - 是否启用悬停效果，默认 false
 */
export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 18,
  className = '',
  style = {},
  title,
  hover = false,
}) => {
  const platformIconMap: Record<string, string> = {
    NetEaseCloudMusic,
    Hifini,
    QQMusic,
    Bilibili,
    YouTubeMusic,
  };

  const iconSrc = platformIconMap[platform];
  
  if (!iconSrc) {
    // 如果平台不在映射中，返回一个默认图标或 null
    return null;
  }

  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={iconSrc}
      alt={platform}
      title={title || platform}
      className={`${hover ? styles.platformIcon : ''} ${className}`}
      style={{
        width: sizeValue,
        height: sizeValue,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
};

export default PlatformIcon;
