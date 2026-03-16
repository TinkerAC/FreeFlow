import PlaylistService from '@main/services/PlaylistService';
import TrackService from '@main/services/TrackService';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { LyricService } from '@main/services/LyricService';
import { FileCacheManager } from '@main/core/FileCacheManager';
import { HifiniDownloader } from '@main/services/Downloader';
import { DataPath } from '@main/core/PathConfig';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { AiTextService } from '@main/services/ai/AiTextService';
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { WindowManager } from '@main/window/windowManager';
import { ConfigService } from '@main/core/configService';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import { ProviderManager } from '@main/core/ProviderManager';
import { SearchService } from '@main/services/SearchService';

export interface IpcContext {
  windowManager: WindowManager;
  configService: ConfigService;
  playlistService: PlaylistService;
  trackService: TrackService;
  netEaseCloudMusic: NetEaseCloudMusic;
  qqMusic: QQMusic;
  lyricService: LyricService;
  fileCacheManager: FileCacheManager;
  downloader: HifiniDownloader;
  dataPath: DataPath;
  bilibili: Bilibili;
  aiText: AiTextService;
  youtubeMusic: YouTubeMusic;
  hifiniMusic: HifiniMusic;
  providerManager: ProviderManager;
  searchService: SearchService;
}
