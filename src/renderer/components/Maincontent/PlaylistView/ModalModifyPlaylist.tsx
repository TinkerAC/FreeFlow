import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { playlistContext } from '@renderer/core/electronContextApi';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';

interface ModalModifyPlaylistProps {
  onClose: () => void;
  musicLibraryController: MusicLibraryController;
}

const ModalModifyPlaylist = ({ onClose, musicLibraryController }: ModalModifyPlaylistProps) => {
  const currentPlaylist = musicLibraryController.activePlaylist;
  const [title, setTitle] = useState(currentPlaylist?.title || '');
  const [description, setDescription] = useState(currentPlaylist?.description || '');
  const [coverUrl, setCoverUrl] = useState(currentPlaylist?.playlist_cover || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await playlistContext.modifyPlaylist({
      playlist_id: currentPlaylist?.playlist_id,
      title,
      description,
      playlist_cover: coverUrl.trim() || undefined,
    });
    await musicLibraryController.refreshPlaylists();
    onClose();
  };

  // 通过 Portal 渲染到 <body>，脱离任何祖先叠层
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.45)',
        zIndex: 9999,                           // ← 顶层
        display: 'grid', placeItems: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onMouseDown={onClose}                     // 点击遮罩关闭
    >
      <div
        style={{
          width: 420, maxWidth: '92vw',
          background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 92%, transparent)',
          color: 'rgb(var(--md-sys-color-on-surface))',
          border: '1px solid rgb(var(--md-sys-color-outline-variant))',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 48px rgba(0,0,0,.35)',
          padding: 20, position: 'relative',
        }}
        onMouseDown={(e) => e.stopPropagation()} // 阻止冒泡到遮罩
        role="dialog"
        aria-modal="true"
        aria-label="编辑歌单"
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute', right: 10, top: 10,
            width: 32, height: 32, borderRadius: 8, border: 0, cursor: 'pointer',
            background: 'transparent', color: 'rgb(var(--md-sys-color-on-surface-variant))',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <i className="fas fa-times" />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>编辑歌单</h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {/* 封面预览 */}
          {coverUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <img
                src={coverUrl}
                alt="封面预览"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                style={{
                  width: 160,
                  height: 160,
                  objectFit: 'cover',
                  borderRadius: 12,
                  border: '2px solid rgb(var(--md-sys-color-outline-variant))',
                  boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                }}
              />
            </div>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>
              封面 URL（可选）
            </span>
            <input
              type="text"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="输入封面图片 URL"
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 80%, transparent)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
                fontSize: 13,
              }}
            />
            <span style={{ fontSize: 11, color: 'rgb(var(--md-sys-color-on-surface-variant))', opacity: 0.7 }}>
              留空则使用第一首歌曲的封面
            </span>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>名称</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 80%, transparent)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>简介（可选）</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入歌单简介"
              style={{
                padding: '10px 12px', borderRadius: 10, resize: 'vertical',
                background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 80%, transparent)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
              }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <button
              type="submit"
              style={{
                minWidth: 120, height: 40, borderRadius: 999, border: 0, cursor: 'pointer',
                background: 'rgb(var(--md-sys-color-primary))',
                color: 'rgb(var(--md-sys-color-on-primary))',
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ModalModifyPlaylist;