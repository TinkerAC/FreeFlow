import React from 'react';

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


// Item 组件，用于展示音乐库中的歌单/专辑 item
export default function Item(
  { imgSrc, altText, title, description, index, isSelected, onClick, onRightClick }: ItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center rounded-lg p-2 h-16 cursor-pointer 
                        ${isSelected ? 'bg-item-bg-selected' : ''} 
                        ${isSelected ? 'hover:bg-item-bg-hover-selected' : 'hover:bg-item-bg-hover'} 
                        active:bg-black`}
      onContextMenu={onRightClick}  // 使用解构后的 onRightClick
    >
      <img src={imgSrc} alt={altText} className="w-12 h-12 rounded-lg" />
      <div className="ml-4">
        <p className="text-white text-base whitespace-nowrap">{title}</p>
        <p className="text-gray-400 text-sm whitespace-nowrap">{description}</p>
      </div>
    </div>
  );
}
