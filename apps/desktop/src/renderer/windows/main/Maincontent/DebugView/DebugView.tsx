import React, { useCallback, useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import PlayerController from '@renderer/core/controller/PlayerController';
import { useLocation } from 'react-router-dom';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import styles from './DebugView.module.css';

interface DebugViewProps {
  player: PlayerController;
}

/* 小工具：安全 JSON 序列化 */
function safeStringify(obj: unknown, space = 2) {
  try {
    return JSON.stringify(obj, (k, v) => (typeof v === 'function' ? '[fn]' : v), space);
  } catch {
    return '[unserializable]';
  }
}

interface PlayerLike {
  audio?: HTMLAudioElement;
  playQueue?: { currentTrack?: { title?: string } };

  on?(evt: string, handler: () => void): void;

  off?(evt: string, handler: () => void): void;
}

const DebugView: React.FC<DebugViewProps> = ({ player }) => {
  const location = useLocation();
  const [playerSnapshot, setPlayerSnapshot] = useState(() => ({ ...player }));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ audio: true, playerRaw: false, route: true });

  const toggle = useCallback((k: string) => setExpanded(s => ({ ...s, [k]: !s[k] })), []);

  /* 订阅 Player 变化 */
  useEffect(() => {
    const handle = () => setPlayerSnapshot({ ...player });
    const p = player as unknown as PlayerLike;
    if (typeof p.on === 'function' && typeof p.off === 'function') {
      p.on('change', handle);
      return () => p.off && p.off('change', handle);
    }
    const id = window.setInterval(handle, 500);
    return () => clearInterval(id);
  }, [player]);

  const audio = (playerSnapshot as unknown as PlayerLike).audio as HTMLAudioElement | undefined;
  const audioDiag = audio ? {
    src: audio.currentSrc,
    currentTime: audio.currentTime,
    duration: audio.duration,
    paused: audio.paused,
    volume: audio.volume,
    networkState: audio.networkState,
    readyState: audio.readyState,
    buffered: (() => {
      try {
        return audio.buffered?.length ? audio.buffered.end(0) : 0;
      } catch {
        return 0;
      }
    })(),
    played: (() => {
      try {
        return audio.played?.length ? audio.played.end(0) : 0;
      } catch {
        return 0;
      }
    })(),
  } : null;

  const header = (
    <div className={styles.headerBar}>
      <div className={styles.headerTitle}>调试信息 (Debug)</div>
      <div className={styles.headerHint}>当前路径: {location.pathname}</div>
    </div>
  );

  return (
    <ViewShell header={header} padded hideScrollbar>
      <div className={styles.grid}>
        <section className={styles.card} aria-label="播放状态">
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>播放概览</h3>
            <div className={styles.metaLine}>
              <span>当前曲目:</span>
              <strong>{playerSnapshot.playQueue?.currentTrack?.title || '无'}</strong>
            </div>
            <div className={styles.metaLine}>
              <span>进度:</span>
              <strong>{audio ? `${audio.currentTime.toFixed(2)} / ${isFinite(audio.duration) ? audio.duration.toFixed(2) : '∞'} s` : '—'}</strong>
            </div>
            <div className={styles.metaLine}>
              <span>状态:</span>
              <strong>{!audio ? '无 Audio 元素' : audio.paused ? '暂停' : '播放中'}</strong>
            </div>
            <button className={styles.toggleBtn} onClick={() => toggle('audio')}>
              {expanded.audio ? '折叠音频细节' : '展开音频细节'}
            </button>
          </div>
          {expanded.audio && audioDiag && (
            <pre className={styles.codeBlock}>{safeStringify(audioDiag)}</pre>
          )}
        </section>

        <section className={styles.card} aria-label="Player 原始快照">
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>Player Snapshot Raw</h3>
            <button className={styles.toggleBtn} onClick={() => toggle('playerRaw')}>
              {expanded.playerRaw ? '折叠' : '展开'}
            </button>
          </div>
          {expanded.playerRaw && (
            <pre className={styles.codeBlock}>{safeStringify(playerSnapshot)}</pre>
          )}
        </section>

        <section className={styles.card} aria-label="路由信息">
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>Route Info</h3>
            <button className={styles.toggleBtn} onClick={() => toggle('route')}>
              {expanded.route ? '折叠' : '展开'}
            </button>
          </div>
          {expanded.route && (
            <pre className={styles.codeBlock}>{safeStringify({
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
              historyLength: window.history.length,
            })}</pre>
          )}
        </section>
      </div>
    </ViewShell>
  );
};

export default DebugView;
