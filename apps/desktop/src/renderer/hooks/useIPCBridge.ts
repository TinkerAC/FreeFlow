// src/renderer/hooks/useIpcBridge.ts
import { useEffect } from 'react';
import PlayerController from '@renderer/core/controller/PlayerController';
import { playerContext, shortcutContext } from '@renderer/core/electronContextApi';
import chalk from 'chalk';

/**
 * 将 IPC 事件映射到播放器操作
 */
export const useIpcBridge = (player: PlayerController | null, isMini: boolean) => {

  // 1. 处理快捷键和状态导出请求
  useEffect(() => {
    if (isMini || !player) return;

    const handleReqState = () => playerContext.broadcastState(player.dumpPlayerState());

    const handleDumpReq = () => {
      try {
        playerContext.sendPlayerState(player.dumpPlayerState(), false);
      } catch {
        console.error(chalk.red('导出播放器状态失败'));
      }
    };

    const handleShortcut = (data: string) => {
      switch (data) {
        case 'prev': player.playPrevious(); break;
        case 'next': player.playNext(); break;
        case 'play-pause': player.togglePlayPause(); break;
        case 'volume-up': player.changeVolume(0.1); break;
        case 'volume-down': player.changeVolume(-0.1); break;
      }
    };

    const handleNotif = (msg: string) => alert(msg);

    // 注册监听
    playerContext.onRequestPlayerState(handleReqState);
    const offDump = (playerContext as any).onDumpRequest?.(handleDumpReq);
    shortcutContext.onShortcut(handleShortcut);
    playerContext.onNotification(handleNotif);

    return () => {
      playerContext.removeRequestPlayerStateListener();
      offDump?.();
      shortcutContext.removeShortcutListener();
      playerContext.removeRequestPlayerStateListener();
    };
  }, [player, isMini]);

  // 2. 处理远程控制命令 (Play, Pause, Seek 等)
  useEffect(() => {
    if (isMini || !player) return;

    const offControl = window.mainApi.playerApi.onControl((cmd: string, payload: any) => {
      // 辅助函数：操作完后广播最新状态
      const pushState = () => {
        try {
          playerContext.broadcastState(player.dumpPlayerState());
        } catch {}
      };

      switch (cmd) {
        case 'play': player.play(); pushState(); break;
        case 'pause': player.pause(); pushState(); break;
        case 'toggle': player.togglePlayPause(); pushState(); break;
        case 'next': player.playNext().finally(pushState); break;
        case 'prev': player.playPrevious().finally(pushState); break;
        case 'seek':
          if (typeof payload === 'number') {
            player.setCurrentTime(payload);
            pushState();
          }
          break;
        case 'setVolume':
          if (typeof payload === 'number') {
            player.setVolume(payload);
            pushState();
          }
          break;
      }
    });

    return () => { offControl?.(); };
  }, [player, isMini]);
};