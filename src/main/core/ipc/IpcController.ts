import { inject, injectable } from 'inversify';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import PlaylistService from '@main/services/PlaylistService';
import TrackService from '@main/services/TrackService';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { LyricService } from '@main/services/LyricService';
import { FileCacheManager } from '@main/core/FileCacheManager';
import { WindowManager } from '@main/window/windowManager';
import { HifiniDownloader } from '@main/services/Downloader';
import { DISymbol } from '@main/di/symbol';
import { DataPath } from '@main/core/PathConfig';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { ConfigService } from '@main/core/configService';
import { PreferenceService } from '@main/services/PreferenceService';
import { AiTextService } from '@main/services/ai/AiTextService';
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { IpcContext } from './handlers/ipcContext';
import { ProviderManager } from '@main/core/ProviderManager';
import { registerSystemHandlers } from './handlers/systemHandlers';
import { registerWindowHandlers } from './handlers/windowHandlers';
import { registerPlaylistHandlers } from './handlers/playlistHandlers';
import { registerPlayerHandlers } from './handlers/playerHandlers';
import { registerTrackHandlers } from './handlers/trackHandlers';
import { registerSearchHandlers } from './handlers/searchHandlers';
import { registerYouTubeMusicHandlers } from './handlers/youtubeHandlers';
import { registerConfigHandlers } from './handlers/configHandlers';
import { registerDownloadHandlers } from './handlers/downloadHandlers';
import { registerMiscHandlers } from './handlers/miscHandlers';

/**
 * IpcController 统一注册所有 IPC 事件，并按功能拆分到独立模块。
 */
@injectable()
export default class IpcController {
  constructor(
    @inject(DISymbol.HifiniMusic) private readonly hifiniMusic: HifiniMusic,
    @inject(DISymbol.PlaylistService) private readonly playlistService: PlaylistService,
    @inject(DISymbol.ConfigService) private readonly configService: ConfigService,
    @inject(DISymbol.TrackService) private readonly trackService: TrackService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netEaseCloudMusic: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qqMusic: QQMusic,
    @inject(DISymbol.LyricService) private readonly lyricService: LyricService,
    @inject(DISymbol.FileCacheManager) private readonly fileCacheManager: FileCacheManager,
    @inject(DISymbol.HifiniDownloader) private readonly downloader: HifiniDownloader,
    @inject(DISymbol.WindowManager) private readonly windowManager: WindowManager,
    @inject(DISymbol.DataPath) private readonly dataPath: DataPath,
    @inject(DISymbol.PreferenceService) private readonly preferenceService: PreferenceService,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
    @inject(DISymbol.AiTextService) private readonly aiText: AiTextService,
    @inject(DISymbol.YouTubeMusic) private readonly youtubeMusic: YouTubeMusic,
    @inject(DISymbol.ProviderManager) private readonly providerManager: ProviderManager,
  ) {
  }

  public register(): void {
    const context: IpcContext = {
      windowManager: this.windowManager,
      configService: this.configService,
      playlistService: this.playlistService,
      trackService: this.trackService,
      netEaseCloudMusic: this.netEaseCloudMusic,
      qqMusic: this.qqMusic,
      lyricService: this.lyricService,
      fileCacheManager: this.fileCacheManager,
      downloader: this.downloader,
      dataPath: this.dataPath,
      preferenceService: this.preferenceService,
      bilibili: this.bilibili,
      aiText: this.aiText,
      youtubeMusic: this.youtubeMusic,
      hifiniMusic: this.hifiniMusic,
      providerManager: this.providerManager,
    };

    registerSystemHandlers(context);
    registerWindowHandlers(context);
    registerPlaylistHandlers(context);
    registerPlayerHandlers(context);
    registerTrackHandlers(context);
    registerSearchHandlers(context);
    registerYouTubeMusicHandlers(context);
    registerConfigHandlers(context);
    registerDownloadHandlers(context);
    registerMiscHandlers(context);
  }
}
