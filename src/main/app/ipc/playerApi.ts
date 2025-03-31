import { ipcRenderer } from 'electron';
import { PlayerState } from '@src/shared/types';

export const playerApi = {

  //用于渲染端从主进程获取播放器状态
  getPlayerStateFromMain: (): Promise<PlayerState> => ipcRenderer.invoke('load-player-state'),


  //用于渲染端接受到主进程发送的"request-player-state"事件后，向主进程发送播放器状态
  sendPlayerState: (playerState: PlayerState) => {
    ipcRenderer.send('reply-player-state', playerState);
  },

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

  },
  removeRequestPlayerStateListener: () => {
    ipcRenderer.removeAllListeners('request-player-state');
    console.log('主进程请求播放器状态事件监听已移除');
  },

};

export type PlayerApi = typeof playerApi;