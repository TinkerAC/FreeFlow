import React, { useEffect, useRef, useState } from 'react';
import PlayQueue from '@components/RightContent/PlayQueue/PlayQueue';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export interface RightContentProps {
  className?: string;
  player: PlayerController | null;
}

export default function RightContent({ player }: RightContentProps) {
  if (!player) return null;

  const [currentTrack, setCurrentTrack] = useState(player.playQueue.currentTrack ?? null);
  const [remainingTracks, setRemainingTracks] = useState(player.playQueue.remainingTracks ?? []);
  const [history, setHistory] = useState<TrackEntity[]>(() => {
    try {
      const raw = localStorage.getItem('recentlyPlayed');
      return raw ? (JSON.parse(raw) as TrackEntity[]) : [];
    } catch { return []; }
  });
  const lastTrackIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const unsub = player.subscribe(() => {
      setCurrentTrack(player.playQueue.currentTrack ?? null);
      setRemainingTracks(player.playQueue.remainingTracks ?? []);

      const t = player.playQueue.currentTrack;
      if (t && (t.id ?? t.platform_unique_id)) {
        const id = (t.id as any) ?? t.platform_unique_id as any;
        if (lastTrackIdRef.current !== id) {
          lastTrackIdRef.current = id;
          // 追加到最近播放（去重，放首）
          setHistory((prev) => {
            const arr = prev.filter(x => (x.id ?? x.platform_unique_id) !== id);
            const next = [t, ...arr].slice(0, 50);
            try { localStorage.setItem('recentlyPlayed', JSON.stringify(next)); } catch {}
            return next;
          });
        }
      }
    });
  return () => unsub();
  }, [player]);

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem('recentlyPlayed'); } catch {}
  };

  if (!currentTrack && !remainingTracks.length) {
    return (
      <div
        style={{
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'rgb(var(--md-sys-color-on-surface-variant))',
          background: 'rgb(var(--md-sys-color-surface-container-low))',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-music" style={{ fontSize: 32, opacity: .6 }} />
          <p style={{ marginTop: 6 }}>暂无播放队列</p>
        </div>
      </div>
    );
  }

  return (
    <PlayQueue
      currentTrack={currentTrack}
      nextTracks={remainingTracks}
      clearQueue={() => player.clearQueue()}
      addToNextAndPlay={(track) => player.addTrackToNextAndPlay(track)}
  historyTracks={history}
  clearHistory={clearHistory}
    />
  );
}