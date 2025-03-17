import { ipcRenderer } from 'electron';
import { PlayerState } from '@src/shared/types';

export const playerApi = {
  getPlayerState: (): Promise<PlayerState> => ipcRenderer.invoke('playerContext-state'),
  sendPlayerState: (state: PlayerState) => {
    ipcRenderer.send('reply-playerContext-state', state);
  },


  // 监听主进程请求播放器状态事件
  onNotification: (callback: (message: string) => void) =>
    ipcRenderer.on('notification', (event, message) => {
      callback(message);
    }),
  onRequestPlayerState: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('request-player-state', () => {
      console.log('主进程请求播放器状态事件已触发');
      listener();
    });
    console.log('主进程请求播放器状态事件监听已添加');

    // 返回移除监听器的函数
    return () => {
      ipcRenderer.removeListener('request-player-state', listener);
      console.log('主进程请求播放器状态事件监听已移除');
    };
  },

};

export type PlayerApi = typeof playerApi;