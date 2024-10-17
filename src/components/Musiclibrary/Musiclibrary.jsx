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
                                         libraryItems = [],
                                         selectedItem,
                                         onSelectItem,
                                         mainContentView,
                                         setMainContentView,
                                         isMusicLibraryCollapsed,
                                         onToggleMusicLibraryCollapsed
                                     }) {
    const handleSelectItem = (index) => {
        if (mainContentView !== 'playlist') {
            setMainContentView('playlist');
        }
        onSelectItem(index);
    };

    if (isMusicLibraryCollapsed) {
        // 折叠状态下的渲染
        return (
            <div className="w-full bg-component-bg text-white rounded-lg h-auto flex flex-col">
                <div className="flex items-center w-full p-6">
                    {/* 切换图标 */}
                    <i
                        className="fas fa-bars cursor-pointer text-2xl"
                        onClick={() => onToggleMusicLibraryCollapsed()}
                    ></i>
                </div>

                <div className="flex justify-center items-center flex-col overflow-y-auto">
                    {libraryItems.map((item, index) => (
                        <div
                            className="w-[4rem] h-[4rem] gap-0.5 flex justify-center items-center rounded-lg hover:bg-item-bg-hover">
                            <img
                                key={index}
                                src={item?.tracks?.[0]?.cover_src || "../assets/default-playlist-cover.png"}
                                alt={item.title}
                                className="w-12 h-12 m-1 rounded-md cursor-pointer"
                                onClick={() => handleSelectItem(index)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    } else {
        // 展开状态下的渲染
        return (
            <div className="w-full bg-component-bg text-white rounded-lg h-auto flex flex-col">
                <div className="flex items-center w-full p-6">
                    {/* 切换图标 */}
                    <i
                        className="fas fa-bars cursor-pointer text-2xl"
                        onClick={() => onToggleMusicLibraryCollapsed()}
                    ></i>

                    {/* 展开状态下显示 "音乐库" 和 "+" 按钮 */}
                    <h1 className="ml-2 text-lg whitespace-nowrap">音乐库</h1>
                    <div className="ml-auto flex items-center">
                        <i
                            className="fas fa-plus text-xl cursor-pointer"
                            onClick={() => window.electronAPI.createPlaylist()}
                        ></i>
                    </div>
                </div>

                <div className="w-full p-4">
                    <div className="flex mb-4 mt-2">
                        <button className="bg-gray-700 text-white px-4 py-1 rounded-full mr-2 whitespace-nowrap">歌单
                        </button>
                        <button className="bg-gray-700 text-white px-4 py-1 rounded-full whitespace-nowrap">专辑
                        </button>
                    </div>
                    <div className="flex items-center mb-4">
                        <i className="fas fa-search text-xl"></i>
                        <span className="ml-auto whitespace-nowrap">最近播放 <i
                            className="fas fa-list text-xl"></i></span>
                    </div>
                    {/* 设置固定高度，确保滚动生效 */}
                    <div className="flex flex-col gap-2 flex-grow overflow-x-hidden overflow-y-auto">
                        {libraryItems.map((item, index) => (
                            <Item
                                key={index}
                                imgSrc={item?.tracks?.[0]?.cover_src || "../assets/default-playlist-cover.png"}
                                altText={item.title}
                                title={item.title}
                                details={item.details}
                                index={index}
                                isSelected={selectedItem === index}
                                onClick={() => handleSelectItem(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}
