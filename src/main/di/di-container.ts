// di-container.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import Store from 'electron-store';
import { Sequelize as SequelizeInstance } from 'sequelize';
import { sequelize } from '@main/database/seqimpl';
import { FileCacheManager } from '@main/core/FileCacheManager';
import ProxyServerManager from '@main/core/AudioProxyServer';
import LocalLibraryService from '@main/services/localLibraryService';
import TrackService from '@main/services/TrackService';
import PlaylistService from '@main/services/playlistService';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { WindowManager } from '@main/window/windowManager';
import { HifiniDownloader } from '@main/services/Downloader';
import { LyricService } from '@main/services/LyricService';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { PlaylistDetailDataSource } from '@main/database/dataSource/PlaylistDetailDataSource';
import { PlaylistDetailDataSourceImpl } from '@main/database/dataSource/impl/PlaylistDetailDataSourceImpl';
import { HifiniThreadCacheDataSource } from '@main/database/dataSource/HifiniThreadCacheDataSource';
import { HifiniThreadCacheDataSourceImpl } from '@main/database/dataSource/impl/HifiniThreadCacheDataSourceImpl';
import { PlaylistDataSource } from '@main/database/dataSource/PlaylistDataSource';
import { PlaylistDataSourceImpl } from '@main/database/dataSource/impl/PlaylistDataSourceImpl';
import { TrackDataSource } from '@main/database/dataSource/TrackDataSource';
import { TrackDataSourceImpl } from '@main/database/dataSource/impl/TrackDataSourceImpl';
import TrackRepository from '@main/database/repository/TrackRepository';
import { TrackRepositoryImpl } from '@main/database/repository/impl/TrackRepositoryImpl';
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import { PlaylistRepositoryImpl } from '@main/database/repository/impl/PlaylistRepositoryImpl';
import HifiniThreadCacheRepository from '@main/database/repository/HifiniThreadCacheRepository';
import { HifiniThreadCacheRepositoryImpl } from '@main/database/repository/impl/HifiniThreadCacheRepositoryImpl';
import { musicCacheDir } from '@main/core/pathConfig';
import { DiSymbol } from '@main/di/symbol';
import { PreferenceService } from '@main/services/PreferenceService';
import IpcController from '@main/core/IpcController';


const container = new Container();
export { container };

// ===== 常量/第三方库实例 =====
container.bind<Store>(DiSymbol.Store).toConstantValue(new Store({ watch: true }));
container
  .bind<SequelizeInstance>(DiSymbol.Sequelize)
  .toConstantValue(sequelize as SequelizeInstance);

// ===== IPC 控制器（单例） =====
container
  .bind<IpcController>(DiSymbol.IpcController)
  .to(IpcController)
  .inSingletonScope();
// ===== 核心管理器/服务（单例） =====
container
  .bind<FileCacheManager>(DiSymbol.FileCacheManager)
  .toConstantValue(
    new FileCacheManager({
      diskCacheDir: musicCacheDir,
    }));
container
  .bind<WindowManager>(DiSymbol.WindowManager)
  .to(WindowManager)
  .inSingletonScope();
container
  .bind<HifiniDownloader>(DiSymbol.HifiniDownloader)
  .to(HifiniDownloader)
  .inSingletonScope();
container
  .bind<ProxyServerManager>(DiSymbol.ProxyServerManager)
  .to(ProxyServerManager)
  .inSingletonScope();

// ===== 业务服务（单例） =====
container
  .bind<LocalLibraryService>(DiSymbol.LocalLibraryService)
  .to(LocalLibraryService)
  .inSingletonScope();
container
  .bind<TrackService>(DiSymbol.TrackService)
  .to(TrackService)
  .inSingletonScope();
container
  .bind<PlaylistService>(DiSymbol.PlaylistService)
  .to(PlaylistService)
  .inSingletonScope();
container
  .bind<LyricService>(DiSymbol.LyricService)
  .to(LyricService)
  .inSingletonScope();

container
  .bind<PreferenceService>(DiSymbol.PreferenceService)
  .to(PreferenceService)
  .inSingletonScope();

// ===== 内容提供者（单例） =====
container
  .bind<HifiniMusic>(DiSymbol.HifiniMusic)
  .to(HifiniMusic)
  .inSingletonScope();
container
  .bind<NetEaseCloudMusic>(DiSymbol.NetEaseCloudMusic)
  .to(NetEaseCloudMusic)
  .inSingletonScope();
container
  .bind<QQMusic>(DiSymbol.QQMusic)
  .to(QQMusic)
  .inSingletonScope();

// ===== 数据源 & 仓库（单例） =====
// DataSource
container
  .bind<PlaylistDetailDataSource>(DiSymbol.PlaylistDetailDataSource)
  .to(PlaylistDetailDataSourceImpl)
  .inSingletonScope();
container
  .bind<HifiniThreadCacheDataSource>(DiSymbol.HifiniThreadCacheDataSource)
  .to(HifiniThreadCacheDataSourceImpl)
  .inSingletonScope();
container
  .bind<PlaylistDataSource>(DiSymbol.PlaylistDataSource)
  .to(PlaylistDataSourceImpl)
  .inSingletonScope();
container
  .bind<TrackDataSource>(DiSymbol.TrackDataSource)
  .to(TrackDataSourceImpl)
  .inSingletonScope();

// Repository
container
  .bind<TrackRepository>(DiSymbol.TrackRepository)
  .to(TrackRepositoryImpl)
  .inSingletonScope();
container
  .bind<PlaylistRepository>(DiSymbol.PlaylistRepository)
  .to(PlaylistRepositoryImpl)
  .inSingletonScope();
container
  .bind<HifiniThreadCacheRepository>(DiSymbol.HifiniThreadCacheRepository)
  .to(HifiniThreadCacheRepositoryImpl)
  .inSingletonScope();
