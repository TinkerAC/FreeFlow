import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { Platform } from '@main/core/enum/Platform';
import { NotImplementedError } from '@main/core/exceptions/NotImplementedError';
import { IpcContext } from './ipcContext';

export function registerSearchHandlers({
                                         netEaseCloudMusic,
                                         trackService,
                                         configService,
                                         providerManager,
                                         searchService,
                                       }: IpcContext): void {


  ipcMain.handle(Channels.Search.GetResults, async (_evt: IpcMainInvokeEvent, keywords: string, safeMode: boolean = false) => {
    console.log('后端收到搜索请求:', keywords, 'SafeMode:', safeMode);
    return await searchService.searchFusion(keywords, safeMode);
  });

  ipcMain.handle(Channels.Search.LocalSearch, async (_evt: IpcMainInvokeEvent, keywords: string) => {
    console.log('后端收到本地搜索请求:', keywords);
    return await trackService.localSearch(keywords);
  });

  ipcMain.handle(
    Channels.Search.GetPlaylistDetail,
    async (_evt: IpcMainInvokeEvent, platform: string, platform_unique_id: string) => {
      console.log('后端收到获取歌单详情请求:', platform, platform_unique_id);
      const toggles = (configService.get('services.providers') ?? {}) as Record<string, boolean>;
      switch (platform) {
        case Platform.NET_EASE_CLOUD_MUSIC:
          if (!providerManager.isEnabled(Platform.NET_EASE_CLOUD_MUSIC)) throw new Error('Provider disabled: NetEaseCloudMusic');
          return await netEaseCloudMusic.getFullPlaylist(platform_unique_id);
        case Platform.QQ_MUSIC:
          throw NotImplementedError;
        case Platform.BILIBILI:
          throw NotImplementedError;
        default:
          throw new Error(`不支持的平台: ${platform}`);
      }
    },
  );
}
