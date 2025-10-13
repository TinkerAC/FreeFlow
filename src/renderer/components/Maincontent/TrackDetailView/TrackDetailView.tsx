import React, { useState, useEffect } from 'react';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { DefaultCover, Bilibili, Hifini, NetEaseCloudMusic, QQMusic, Local, YouTubeMusic } from '@components/static';
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';
import styles from './TrackDetailView.module.css';

interface TrackDetailViewProps {
  track: TrackEntity;
  player: PlayerController;
  musicLibraryController: MusicLibraryController;
}

export default function TrackDetailView({ track, player, musicLibraryController }: TrackDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrack, setEditedTrack] = useState({
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // 当 track 改变时，更新编辑状态
  useEffect(() => {
    setEditedTrack({
      title: track.title || '',
      artist: track.artist || '',
      album: track.album || '',
    });
    setIsEditing(false);
  }, [track]);

  // 格式化时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化日期
  const formatDate = (date?: Date) => {
    if (!date) return '未知';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取平台图标
  const getPlatformIcon = (platform?: string) => {
    const size = 24;
    const common = { width: size, height: size, objectFit: 'contain' } as const;
    if (platform === 'NetEaseCloudMusic') return <img src={NetEaseCloudMusic} alt={platform} style={common} />;
    if (platform === 'Hifini') return <img src={Hifini} alt={platform} style={common} />;
    if (platform === 'QQMusic') return <img src={QQMusic} alt={platform} style={common} />;
    if (platform === 'Bilibili') return <img src={Bilibili} alt={platform} style={common} />;
    if (platform === 'YouTubeMusic') return <img src={YouTubeMusic} alt={platform} style={common} />;
    if (platform === 'Local') return <img src={Local} alt={platform} style={common} />;
    return null;
  };

  // 获取平台名称
  const getPlatformName = (platform?: string) => {
    const names: Record<string, string> = {
      'NetEaseCloudMusic': '网易云音乐',
      'Hifini': 'HiFiNi',
      'QQMusic': 'QQ音乐',
      'Bilibili': 'Bilibili',
      'YouTubeMusic': 'YouTube Music',
      'Local': '本地音乐',
    };
    return names[platform || ''] || platform || '未知';
  };

  // 保存编辑
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await window.mainApi.trackApi.updateBasic({
        platform: track.platform,
        platform_unique_id: track.platform_unique_id,
        title: editedTrack.title,
        artist: editedTrack.artist,
        album: editedTrack.album,
      });
      await musicLibraryController.refreshPlaylists();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update track:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditedTrack({
      title: track.title || '',
      artist: track.artist || '',
      album: track.album || '',
    });
    setIsEditing(false);
  };

  // 添加到播放队列
  const handlePlay = () => {
    player.addTrackToNext(track);
  };

  // 添加到歌单
  const handleAddToPlaylist = async (playlistId: number) => {
    try {
      if (playlistId === 0) {
        await libraryContext.addTrackToLibrary(track);
      } else {
        await playlistContext.addTrackToPlaylist(track, playlistId);
      }
      await musicLibraryController.refreshPlaylists();
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      alert('添加失败：' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 下载
  const handleDownload = async () => {
    try {
      await libraryContext.downFromHifini(track);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('下载失败：' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const playlists = musicLibraryController.playlists ?? [];

  return (
    <ViewShell padded hideScrollbar>
      <div className={styles.container}>
        {/* 顶部封面与基本信息 */}
        <div className={styles.header}>
          <div className={styles.coverWrapper}>
            <img
              src={track.cover_src || DefaultCover}
              alt={track.title}
              className={styles.cover}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DefaultCover;
              }}
            />
            <div className={styles.coverOverlay}>
              <button className={styles.playBtn} onClick={handlePlay} aria-label="播放">
                <i className="fas fa-play" />
              </button>
            </div>
          </div>

          <div className={styles.basicInfo}>
            {isEditing ? (
              <>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editedTrack.title}
                  onChange={(e) => setEditedTrack({ ...editedTrack, title: e.target.value })}
                  placeholder="歌曲标题"
                />
                <input
                  type="text"
                  className={styles.editInput}
                  value={editedTrack.artist}
                  onChange={(e) => setEditedTrack({ ...editedTrack, artist: e.target.value })}
                  placeholder="艺术家"
                />
                <input
                  type="text"
                  className={styles.editInput}
                  value={editedTrack.album}
                  onChange={(e) => setEditedTrack({ ...editedTrack, album: e.target.value })}
                  placeholder="专辑"
                />
              </>
            ) : (
              <>
                <h1 className={styles.title}>{track.title || '未知标题'}</h1>
                <p className={styles.artist}>{track.artist || '未知艺术家'}</p>
                {track.album && <p className={styles.album}>{track.album}</p>}
              </>
            )}

            <div className={styles.platform}>
              {getPlatformIcon(track.platform)}
              <span>{getPlatformName(track.platform)}</span>
            </div>
          </div>
        </div>

        {/* 操作按钮区 */}
        <div className={styles.actions}>
          {isEditing ? (
            <>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={isLoading}>
                <i className="fas fa-check" />
                <span>{isLoading ? '保存中...' : '保存'}</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleCancel} disabled={isLoading}>
                <i className="fas fa-times" />
                <span>取消</span>
              </button>
            </>
          ) : (
            <>
              <button className={styles.btnPrimary} onClick={handlePlay}>
                <i className="fas fa-play" />
                <span>播放</span>
              </button>
              <button className={styles.btnSecondary} onClick={() => setIsEditing(true)}>
                <i className="fas fa-pen" />
                <span>编辑</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleDownload}>
                <i className="fas fa-download" />
                <span>下载</span>
              </button>
            </>
          )}
        </div>

        {/* 详细信息区 */}
        <div className={styles.details}>
          <h2 className={styles.sectionTitle}>详细信息</h2>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>时长</span>
              <span className={styles.detailValue}>{formatDuration(track.duration)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>播放次数</span>
              <span className={styles.detailValue}>{track.played_count || 0} 次</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>添加时间</span>
              <span className={styles.detailValue}>{formatDate(track.created_at)}</span>
            </div>
            {track.modified_at && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>修改时间</span>
                <span className={styles.detailValue}>{formatDate(track.modified_at)}</span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>平台 ID</span>
              <span className={styles.detailValue}>{track.platform_unique_id}</span>
            </div>
            {track.downloaded !== undefined && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>下载状态</span>
                <span className={styles.detailValue}>
                  {track.downloaded ? (
                    <span className={styles.downloaded}>
                      <i className="fas fa-check-circle" /> 已下载
                    </span>
                  ) : (
                    <span className={styles.notDownloaded}>未下载</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 添加到歌单 */}
        {!isEditing && (
          <div className={styles.playlists}>
            <h2 className={styles.sectionTitle}>添加到歌单</h2>
            <div className={styles.playlistGrid}>
              {playlists.map((playlist) => (
                <button
                  key={playlist.playlist_id}
                  className={styles.playlistItem}
                  onClick={() => handleAddToPlaylist(playlist.playlist_id!)}
                >
                  <div className={styles.playlistCover}>
                    <img
                      src={playlist.playlist_cover || playlist.tracks?.[0]?.cover_src || DefaultCover}
                      alt={playlist.title}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className={styles.playlistInfo}>
                    <span className={styles.playlistTitle}>{playlist.title}</span>
                    <span className={styles.playlistCount}>{playlist.tracks?.length || 0} 首</span>
                  </div>
                  <i className="fas fa-plus" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ViewShell>
  );
}
