// file: src/renderer/components/Musiclibrary/Item.tsx
import React from 'react';
import styles from './LibraryItem.module.css';
import clsx from 'clsx';
import { DefaultCover } from '@components/static';

interface ItemProps {
  imgSrc: string;
  altText: string;
  title: string;
  description: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
}

export default function Item({
                               imgSrc, altText, title, description, isSelected, onClick, onRightClick,
                               onDragStart, onDragOver, onDrop, onDragEnd, isDragging,
                             }: ItemProps) {

  imgSrc = imgSrc || DefaultCover;
  return (
    <div
      className={clsx(styles.root, isSelected && styles.selected, isDragging && styles.dragging)}
      onClick={onClick}
      onContextMenu={onRightClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      // 键盘可达性：Enter/Space 触发
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={isSelected}
      aria-label={title}
      title={title}
    >
      <img src={imgSrc} alt={altText}
           referrerPolicy="no-referrer"
           className={styles.thumb}

      />
      <div className={styles.texts}>
        <p className={styles.title} title={title}>{title}</p>
        <p className={styles.desc} title={description}>{description}</p>
      </div>
    </div>
  );
}