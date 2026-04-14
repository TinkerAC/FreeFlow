import React, { useEffect, useMemo, useRef, useState } from 'react';
import Item from './Item';
import { DefaultPlaylistCover } from '@src/renderer/components/static';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import styles from './MusicLibrary.module.css';
import clsx from 'clsx';
import { Platform } from '@main/core/enum/Platform';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { syncOwnedFreeFlowLibrary } from '@renderer/core/freeflow/ownedLibrary';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';

interface MusicLibraryProps {
  musicLibraryController: MusicLibraryController;
}

export default function MusicLibrary({ musicLibraryController }: MusicLibraryProps) {
  const navigation = useNavigation();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();

  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [playlists, setPlaylists] = useState(musicLibraryController.playlists);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(() => {
      setCollapsed(musicLibraryController.isMusicLibraryCollapsed);
      setPlaylists(musicLibraryController.playlists);
    });
    return () => unsubscribe();
  }, [musicLibraryController]);

  const syncOwnedTracks = React.useCallback(async () => {
    if (!address || !walletProvider) return;
    setSyncing(true);
    setSyncError('');
    try {
      await syncOwnedFreeFlowLibrary({
        baseUrl: web25BaseUrl.value,
        walletProvider,
        account: address,
      });
      await musicLibraryController.refreshPlaylists();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error ?? '同步失败'));
    } finally {
      setSyncing(false);
    }
  }, [address, musicLibraryController, walletProvider, web25BaseUrl.value]);

  useEffect(() => {
    if (!isConnected || !address || !walletProvider) return;
    void syncOwnedTracks();
  }, [address, isConnected, syncOwnedTracks, walletProvider]);

  const chainLibrary = useMemo(() => {
    const libraryPlaylist = playlists.find((playlist) => playlist.playlist_id === 0);
    if (!libraryPlaylist) return null;
    return {
      ...libraryPlaylist,
      platform: Platform.FREEFLOW,
      platform_unique_id: 'freeflow-library',
      title: '链上音乐库',
      description: '当前钱包拥有访问权的链上资源',
      tracks: (libraryPlaylist.tracks || []).filter((track) => track.platform === Platform.FREEFLOW),
    };
  }, [playlists]);

  const isSelected = !!chainLibrary && musicLibraryController.activePlaylist?.playlist_id === chainLibrary.playlist_id;

  useEffect(() => {
    if (!chainLibrary) return;
    if (musicLibraryController.activePlaylist?.playlist_id === chainLibrary.playlist_id) return;
    musicLibraryController.activePlaylist = chainLibrary;
  }, [chainLibrary, musicLibraryController]);

  const openChainLibrary = () => {
    if (!chainLibrary) return;
    musicLibraryController.activePlaylist = chainLibrary;
    navigation.push(ViewType.PLAYLIST);
  };

  return (
    <aside ref={rootRef} className={clsx(styles.root, collapsed && styles.collapsed)}>
      {/* 头部 */}
      <div className={styles.header}>
        {/* 左：汉堡按钮（收起/展开） */}
        <button
          className={clsx(styles.iconBtn, styles.menuBtn)}
          title={collapsed ? '展开音乐库' : '收起音乐库'}
          onClick={() => musicLibraryController.toggleMusicLibraryCollapse()}
        >
          <i className="fas fa-bars" />
        </button>

        {/* 中：标题（收起态完全不渲染） */}
        {!collapsed && <div className={styles.title}>链上音乐库</div>}

        {/* 右：同步（仅展开态可见，样式控制） */}
        <button
          className={clsx(styles.iconBtn, styles.addBtn)}
          title="同步已拥有资源"
          onClick={() => void syncOwnedTracks()}
          disabled={!isConnected || !address || !walletProvider || syncing}
        >
          <i className={syncing ? 'fas fa-spinner fa-spin' : 'fas fa-rotate-right'} />
        </button>
      </div>

      {/* 工具行（仅展开态显示） */}
      {!collapsed && (
        <div className={styles.toolbar}>
          <button className={clsx(styles.chip, styles.chipActive)}>链上资源</button>
          <button className={styles.chip}>{isConnected ? '钱包已连接' : '钱包未连接'}</button>
          <div style={{ marginLeft: 'auto', opacity: .8 }}>
            <i className="fas fa-cube" title="链上资源库" />
          </div>
        </div>
      )}

      {/* 列表滚动区（唯一滚动） */}
      <div className={styles.scroll}>
        {/* 展开态：纵向列表（仅链上音乐库） */}
        {!collapsed && (
          <div className={styles.list}>
            {chainLibrary ? (
              <Item
                imgSrc={chainLibrary?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                altText={`${chainLibrary.title} key:${chainLibrary.playlist_id}`}
                title={chainLibrary.title}
                description={`${chainLibrary.tracks.length} 首`}
                index={0}
                isSelected={isSelected}
                onClick={openChainLibrary}
                onRightClick={(event) => event.preventDefault()}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>暂无链上资源</div>
            )}
            {syncError && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgb(var(--md-sys-color-error))' }}>{syncError}</div>
            )}
          </div>
        )}

        {/* 收起态：单列图标网格 */}
        {collapsed && (
          <div className={styles.grid}>
            {chainLibrary && (
              <div
                className={clsx(styles.tile, isSelected && styles.tileSelected)}
                onClick={openChainLibrary}
                title={chainLibrary.title}
                tabIndex={0}
              >
                <img
                  src={chainLibrary?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                  alt={`${chainLibrary.title} key:${chainLibrary.playlist_id}`}
                  draggable={false}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
