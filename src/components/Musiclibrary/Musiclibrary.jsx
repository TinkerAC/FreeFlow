import React, {useEffect, useState} from 'react';
import Item from './Item.jsx';
import ContextMenu from "./ContextMenu.jsx";

export default function MusicLibrary({
                                         libraryItems = [],
                                         selectedItem,
                                         onSelectItem,
                                         mainContentView,
                                         setMainContentView,
                                         isMusicLibraryCollapsed,
                                         onToggleMusicLibraryCollapsed,
                                         refreshPlaylist
                                     }) {
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
    const [eventPlaylist, setEventPlaylist] = useState(null);
    const handleSelectItem = (index) => {
        if (mainContentView !== 'playlist') {
            setMainContentView('playlist');
        }
        onSelectItem(index);
    };

    const handleRightClick = (e, playlist_id) => {
        e.preventDefault();
        console.log(`右键点击了歌单${playlist_id},当前ContextMenu的位置为${contextMenuPosition},当前ContextMenu是否显示${contextMenuVisible}`);
        setEventPlaylist(libraryItems.find(item => item.playlist_id === playlist_id));
        setContextMenuPosition({x: e.clientX, y: e.clientY});
        setContextMenuVisible(true);

    }

    const handleCloseMenu = () => {
        setContextMenuVisible(false);
        setEventPlaylist(null);
    }
    // 添加全局点击事件，用于关闭右键菜单
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenuVisible) {
                handleCloseMenu();
            }
        };

        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, [contextMenuVisible]);


    // console.log(libraryItems);

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
                                key={item.playlist_id}
                                src={item?.tracks?.[0]?.cover_src || "../assets/default-playlist-cover.png"}
                                alt={item.title + 'key:' + item.playlist_id}
                                className="w-12 h-12 m-1 rounded-md cursor-pointer"
                                onClick={() => handleSelectItem(index)}

                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    } else {
        // 展开状态下的渲染,只有展开状态下才允许右键显示菜单
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
                            onClick={() => window.electronAPI.createPlaylist(refreshPlaylist)}
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

                        {(libraryItems !== undefined && libraryItems.length !== 0) ? libraryItems.map((item, index) => (
                            <Item
                                key={item.playlist_id}
                                imgSrc={item?.tracks?.[0]?.cover_src || "../assets/default-playlist-cover.png"}
                                altText={item.title + "key:" + item.playlist_id}
                                title={item.title}
                                details={item.details}
                                index={index}
                                isSelected={selectedItem === index}
                                onClick={() => handleSelectItem(index)}
                                onRightClick={(e) => handleRightClick(e, item.playlist_id)}
                            />
                        )) : <div className="text-center text-gray-400">暂无歌单</div>


                        }
                    </div>
                </div>


                {/*条件渲染右键菜单*/}
                {contextMenuVisible && (
                    <ContextMenu
                        x={contextMenuPosition.x}
                        y={contextMenuPosition.y}
                        eventPlaylist={eventPlaylist}
                        handleCloseMenu={handleCloseMenu}
                        refreshPlaylist={refreshPlaylist}
                    />)}


            </div>)
    }
}
