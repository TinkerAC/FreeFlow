import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export default function ModalEditTrack({
                                         track,
                                         onClose,
                                         onSaved,
                                       }: { track: TrackEntity; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [album, setAlbum] = useState(track.album || '');
  const [busy, setBusy] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await (window as any).mainApi.trackApi.updateBasic({
        platform: track.platform,
        platform_unique_id: track.platform_unique_id,
        title,
        artist,
        album,
      });
      await onSaved();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const aiClean = async () => {
    setCleaning(true);
    try {
      const res = await (window as any).mainApi.trackApi.cleanBasic({ title, artist, album });
      if (res?.title) setTitle(res.title);
      if (typeof res?.artist === 'string') setArtist(res.artist);
      if (typeof res?.album === 'string') setAlbum(res.album);
    } finally {
      setCleaning(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="编辑歌曲信息"
    >
      <div
        style={{
          width: 520,
          maxWidth: '92vw',
          background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 92%, transparent)',
          color: 'rgb(var(--md-sys-color-on-surface))',
          border: '1px solid rgb(var(--md-sys-color-outline-variant))',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 48px rgba(0,0,0,.35)',
          padding: 20,
          position: 'relative',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 0,
            cursor: 'pointer',
            background: 'transparent',
            color: 'rgb(var(--md-sys-color-on-surface-variant))',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <i className="fas fa-times" />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>编辑歌曲信息</h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>标题</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 80%, transparent)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>歌手</span>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 80%, transparent)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>专辑</span>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'color-mix(in oklab, rgb(var(--md-sys-color-surface)) 80%, transparent)',
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                color: 'rgb(var(--md-sys-color-on-surface))',
              }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6, gap: 10 }}>
            <button
              onClick={aiClean}
              disabled={busy || cleaning}
              style={{
                minWidth: 120,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                background: 'transparent',
                color: 'rgb(var(--md-sys-color-on-surface))',
                cursor: 'pointer',
              }}
            >{cleaning ? '清洗中…' : 'AI 清洗'}</button>
            <button
              onClick={onClose}
              disabled={busy}
              style={{
                minWidth: 100,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgb(var(--md-sys-color-outline-variant))',
                background: 'transparent',
                color: 'rgb(var(--md-sys-color-on-surface))',
                cursor: 'pointer',
              }}
            >取消
            </button>
            <button
              onClick={save}
              disabled={busy}
              style={{
                minWidth: 120,
                height: 36,
                borderRadius: 999,
                border: 0,
                background: 'rgb(var(--md-sys-color-primary))',
                color: 'rgb(var(--md-sys-color-on-primary))',
                cursor: 'pointer',
              }}
            >保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
