import React, { useEffect, useState } from 'react';
import PlayerController from '@renderer/core/controller/PlayerController';
import { MainContentViewStack } from '@components/Maincontent/MainContentViewStack';

interface DebugViewProps {
  player: PlayerController;
  mainContentStack: MainContentViewStack;
}

/**
 * DebugView – A dark‑theme debug panel for PlayerController and MainContentViewStack.
 *
 * • Subscribes to `change` events (if exposed) to keep the UI in sync.
 * • Falls back to shallow‑copy snapshots when event bus isn’t available.
 * • Exposes richer runtime diagnostics: bitrate, sampleRate, ready/network state …
 */
const DebugView: React.FC<DebugViewProps> = ({ player, mainContentStack }) => {
  // Snapshots used to trigger React re‑renders
  const [playerSnapshot, setPlayerSnapshot] = useState(() => ({ ...player }));
  const [stackSnapshot, setStackSnapshot] = useState(() => ({ ...mainContentStack }));

  /* PlayerController event → snapshot */
  useEffect(() => {
    const handlePlayerChange = () => setPlayerSnapshot({ ...player });
    if (typeof (player as any).on === 'function') {
      (player as any).on('change', handlePlayerChange);
      return () => (player as any).off('change', handlePlayerChange);
    }
    setPlayerSnapshot({ ...player });
  }, [player]);

  /* Stack event → snapshot */
  useEffect(() => {
    const handleStackChange = () => setStackSnapshot({ ...mainContentStack });
    if (typeof (mainContentStack as any).on === 'function') {
      (mainContentStack as any).on('change', handleStackChange);
      return () => (mainContentStack as any).off('change', handleStackChange);
    }
    setStackSnapshot({ ...mainContentStack });
  }, [mainContentStack]);

  // Helper for audio‑related diagnostics
  const audio = playerSnapshot.audio as HTMLAudioElement | undefined;
  const audioDiagnostics = audio
    ? {
      bitrate: (audio as any).bitrate ?? 'N/A',
      sampleRate: (audio as any).sampleRate ?? 'N/A',
      networkState: audio.networkState,
      readyState: audio.readyState,
      buffered: audio.buffered?.length ? `${Math.round(audio.buffered.end(0) * 1000)} ms` : '0',
      played: audio.played?.length ? `${Math.round(audio.played.end(0) * 1000)} ms` : '0',
    }
    : {};

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-gray-900 text-gray-100 font-mono">
      {/* PlayerController Debug Block */}
      <section
        className="w-full lg:w-3/4 xl:w-1/2 mx-auto mb-8 bg-gray-800/80 backdrop-blur rounded-xl shadow-lg p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-purple-400">Player Snapshot</h2>
        <div className="space-y-1">
          <div>
            <span className="text-purple-300">Current Track:</span>{' '}
            {playerSnapshot.playQueue.currentTrack?.title ?? 'None'}
          </div>
          <div>
            <span className="text-purple-300">Position:</span>{' '}
            {audio ? `${audio.currentTime.toFixed(2)} / ${audio.duration.toFixed(2)} s` : '—'}
          </div>
          <div>
            <span className="text-purple-300">State:</span>{' '}
            {audio?.paused ? 'Paused' : 'Playing'}
          </div>
        </div>

        {/* Audio element metadata */}
        <details className="mt-4 open:text-purple-400">
          <summary className="cursor-pointer select-none">Raw audio element metadata</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs">
            {JSON.stringify(
              {
                src: audio?.currentSrc,
                duration: audio?.duration,
                currentTime: audio?.currentTime,
                paused: audio?.paused,
                volume: audio?.volume,
                ...audioDiagnostics,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </section>

      {/* MainContentViewStack Debug Block */}
      <section className="w-full lg:w-3/4 xl:w-1/2 mx-auto bg-gray-800/80 backdrop-blur rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-teal-400 mb-2">MainContentViewStack Snapshot</h2>
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(stackSnapshot, null, 2)}
        </pre>
      </section>
    </div>
  );
};

export default DebugView;
