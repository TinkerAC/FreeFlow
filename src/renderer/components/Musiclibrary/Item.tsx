// file: src/renderer/components/Musiclibrary/Item.tsx
import React from 'react';
import styles from './LibraryItem.module.css';
import clsx from 'clsx';

interface ItemProps {
  imgSrc: string;
  altText: string;
  title: string;
  description: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function Item({
                               imgSrc, altText, title, description, isSelected, onClick, onRightClick,
                             }: ItemProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onRightClick}
      className={clsx(styles.root, isSelected && styles.selected)}
    >
      <img src={imgSrc} alt={altText} className={styles.thumb} />
      <div className={styles.texts}>
        <p className={styles.title} title={title}>{title}</p>
        <p className={styles.desc}  title={description}>{description}</p>
      </div>
    </div>
  );
}
