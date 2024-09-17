import {useState, useEffect} from 'react';

async function fetchTrackInfo(file_path,data_href) {
    return await window.playerAPI.getTrackInfo(file_path,data_href);
}

function useMusicLibrary() {
    const [playlists, setPlaylists] = useState([]); // 存储所有歌单的状态
    const [selectedItem, setSelectedItem] = useState(null); // 当前选中的歌单索引
    const [selectedPlaylistInfo, setSelectedPlaylistInfo] = useState(null); // 当前选中的歌单信息

    const [isMusicLibraryCollapsed, setIsMusicLibraryCollapsed] = useState(false); // 控制音乐库折叠状态
    const fetchAndCompletePlaylists = async () => {
            try {
                const playlists = await window.electron.getPlaylists(); // 调用 electron API 获取歌单
                console.log('初始化歌单:', playlists);

                // 并行获取每个歌曲的完整信息
                const completedPlaylists = await Promise.all(
                    playlists.map(async (playlist) => {
                        const tracksWithInfo = await Promise.all(
                            playlist.tracks.map(async (track) => {
                                const trackInfo = await fetchTrackInfo(track.file_path,track.data_href);
                                return {
                                    ...track,
                                    ...trackInfo
                                };
                            })
                        );
                        return {
                            ...playlist,
                            tracks: tracksWithInfo
                        };
                    })
                );

                setPlaylists(completedPlaylists);
                console.log('完成歌单:', completedPlaylists);
            } catch (error) {
                console.error('Failed to fetch and complete playlists:', error);
            }
        };

    // 加载并完善歌单信息
    useEffect(() => {

        fetchAndCompletePlaylists();

    }, []); // 只在组件挂载时执行一次

    const selectItem = (index) => {
        setSelectedItem(index);
        setSelectedPlaylistInfo(playlists[index]);
    };


    return {
        playlists,
        selectedItem,
        selectedPlaylistInfo,
        setSelectedItem: selectItem,
        isMusicLibraryCollapsed,
        setIsMusicLibraryCollapsed,
        refreshPlaylists: fetchAndCompletePlaylists,
    };
}

export default useMusicLibrary;
