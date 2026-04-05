// src/renderer/hooks/usePlayerFactory.ts
import { useEffect, useRef, useState } from 'react';
import PlayerController from '@renderer/core/controller/PlayerController';
import { playerContext } from '@renderer/core/electronContextApi';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { PlaybackMode } from '@renderer/core/enum/PlaybackMode';
import chalk from 'chalk';

export const usePlayerFactory = (
  audioRef: React.RefObject<HTMLAudioElement>,
  isMini: boolean,
) => {
  const playerInstanceRef = useRef<PlayerController | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    queue: { queue: [], indexList: [], currentIndex: 0 },
    volume: 0.5,
    playbackMode: PlaybackMode.LOOP,
    audioSrc: '',
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
  });

  useEffect(() => {
    if (isMini || !audioRef.current || playerInstanceRef.current) return;

    const initPlayer = async () => {
      // 1. 获取持久化数据
      const dump = await playerContext.getPlayerStateFromMain();

      // 2. 再次检查 Ref 防止竞态条件
      if (!audioRef.current) return;

      const player = new PlayerController(audioRef.current);

      // 3. 绑定状态更新
      player.subscribe((st: PlayerState) => {
        setPlayerState(st);
        // 广播状态给 Mini 窗口
        playerContext.broadcastState(st);
      });

      playerInstanceRef.current = player;

      // 4. 恢复状态
      if (dump) {
        try {
          await player.loadFromDump(dump);
        } catch (e) {
          console.error('从 dump 初始化播放器失败', e);
        }
      }
      console.log(chalk.green('播放器初始化完成!'));
    };

    initPlayer().then(() => console.info(chalk.green('播放器工厂逻辑执行完毕')));
  }, [audioRef, isMini]);

  return { playerInstance: playerInstanceRef.current, playerState };
};