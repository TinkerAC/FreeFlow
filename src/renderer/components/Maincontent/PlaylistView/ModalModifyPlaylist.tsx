import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { playlistContext } from '@renderer/core/electronContextApi';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';

interface ModalModifyPlaylistProps {
  onClose: () => void;
  musicLibraryController: MusicLibraryController;
}

const ModalModifyPlaylist = ({ onClose, musicLibraryController }: ModalModifyPlaylistProps) => {
  const [title, setTitle] = useState(musicLibraryController.activePlaylist?.title || '');
  const [description, setDescription] = useState(musicLibraryController.activePlaylist?.description || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await playlistContext.modifyPlaylist(
      { playlist_id: musicLibraryController.activePlaylist?.playlist_id, title, description },
    );
    musicLibraryController.refreshPlaylists();
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

        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>编辑歌单</h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
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
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>添加简介（可选）</span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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