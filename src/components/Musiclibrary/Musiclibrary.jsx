import React from 'react';

const Item = ({imgSrc, altText, title, details, index, isSelected, onClick}) => {
    return (
        <div
            onClick={onClick}
            className={`flex items-center rounded-lg p-2 h-16 cursor-pointer 
                        ${isSelected ? 'bg-item-bg-selected' : ''}
                        ${isSelected ? 'hover:bg-item-bg-hover-selected' : 'hover:bg-item-bg-hover'}
                        active:bg-black`}
        >
            <img src={imgSrc} alt={altText} className="w-12 h-12 rounded-lg"/>
            <div className="ml-4">
                <p className="text-white text-base whitespace-nowrap">{title}</p>
                <p className="text-gray-400 text-sm whitespace-nowrap">{details}</p>
            </div>
        </div>
    );
};

export default function MusicLibrary({
                                         libraryItems = []
                                         , selectedItem, onSelectItem
                                     }) {


    return (
        <div className="w-full bg-component-bg text-white p-4 rounded-lg">
            <div className="flex items-center mb-6">
                <i className="fas fa-bars text-xl"></i>
                <h1 className="ml-2 text-lg">音乐库</h1>
                <div className="ml-auto flex items-center">
                    <i
                        className="fas fa-plus text-xl cursor-pointer"
                        onClick={() => window.electron.createPlaylist()}
                    ></i>
                    <i className="fas fa-arrow-right text-xl ml-4"></i>
                </div>
            </div>
            <div className="flex mb-4">
                <button className="bg-gray-700 text-white px-4 py-1 rounded-full mr-2">歌单</button>
                <button className="bg-gray-700 text-white px-4 py-1 rounded-full">专辑</button>
            </div>
            <div className="flex items-center mb-4">
                <i className="fas fa-search text-xl"></i>
                <span className="ml-auto">最近播放 <i className="fas fa-list text-xl"></i></span>
            </div>
            {/* 设置固定高度，确保滚动生效 */}
            <div className="flex flex-col gap-2 flex-grow overflow-x-hidden overflow-y-auto">
                {libraryItems.map((item, index) => (
                    <Item
                        key={index}
                        imgSrc={item.imgSrc}
                        altText={item.title}
                        title={item.title}
                        details={item.details}
                        index={index}
                        isSelected={selectedItem === index}
                        onClick={() => onSelectItem(index)}
                    />
                ))}
            </div>
        </div>
    );
}
