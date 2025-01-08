import { useEffect, useState } from 'react';
import useStateRef from 'react-usestateref';
import context from '@main/app/electronContextApi';



function useMusicLibrary() {
  const [, setPlaylists, playlistsRef] = useStateRef([]); // 存储所有歌单的状态
  const [, setSelectedItem, selectedItemRef] = useStateRef(null); // 当前选中的歌单索引
  const [, setSelectedPlaylistInfo, selectedPlaylistInfoRef] = useStateRef(null); // 当前选中的歌单信息

  const [isMusicLibraryCollapsed, setIsMusicLibraryCollapsed] = useState(false); // 控制音乐库折叠状态
  const fetchAndCompletePlaylists = async () => {
    try {
      const playlists = await context.getPlaylists(); // 调用 electron API 获取歌单
      console.log('playlists:', playlists);
      setPlaylists(playlists); // 更新歌单状态
    } catch (error) {
      console.error('Failed to fetch and complete playlists:', error);
    }
  };

  // 选中歌单
  const selectItem = (index: number) => {
    setSelectedItem(index);
    setSelectedPlaylistInfo(playlistsRef.current[index]);
  };


  // 加载并完善歌单信息, 并默认选中第一个歌单
  useEffect(() => {
    fetchAndCompletePlaylists().then(() => {
      selectItem(0);
    });

  }, []); // 只在组件挂载时执行一次


  return {
    playlists: playlistsRef.current,
    selectedItem: selectedItemRef.current,
    selectedPlaylistInfo: selectedPlaylistInfoRef.current,
    setSelectedItem: selectItem,
    isMusicLibraryCollapsed,
    setIsMusicLibraryCollapsed,
    refreshPlaylists: fetchAndCompletePlaylists,
    setSelectedPlaylistInfo
  };
}

export default useMusicLibrary;
