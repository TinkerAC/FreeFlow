// di-container.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import Store from 'electron-store';
import { Sequelize as SequelizeInstance } from 'sequelize';
import { sequelize } from '@main/database/seqimpl';
import { FileCacheManager } from '@main/FileCacheManager';
import ProxyServerManager from '@main/app/proxyServer';
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
import { musicCacheDir } from '@main/app/pathConfig';
import { TYPES } from '@main/di/symbol';


const container = new Container();
export { container };

// ===== 常量/第三方库实例 =====
container.bind<Store>(TYPES.Store).toConstantValue(new Store({ watch: true }));
container
  .bind<SequelizeInstance>(TYPES.Sequelize)
  .toConstantValue(sequelize as SequelizeInstance);

// ===== 核心管理器/服务（单例） =====
container
  .bind<FileCacheManager>(TYPES.FileCacheManager)
  .toConstantValue(
    new FileCacheManager({
      diskCacheDir: musicCacheDir,
    }));
container
  .bind<WindowManager>(TYPES.WindowManager)
  .to(WindowManager)
  .inSingletonScope();
container
  .bind<HifiniDownloader>(TYPES.HifiniDownloader)
  .to(HifiniDownloader)
  .inSingletonScope();
container
  .bind<ProxyServerManager>(TYPES.ProxyServerManager)
  .to(ProxyServerManager)
  .inSingletonScope();

// ===== 业务服务（单例） =====
container
  .bind<LocalLibraryService>(TYPES.LocalLibraryService)
  .to(LocalLibraryService)
  .inSingletonScope();
container
  .bind<TrackService>(TYPES.TrackService)
  .to(TrackService)
  .inSingletonScope();
container
  .bind<PlaylistService>(TYPES.PlaylistService)
  .to(PlaylistService)
  .inSingletonScope();
container
  .bind<LyricService>(TYPES.LyricService)
  .to(LyricService)
  .inSingletonScope();

// ===== 内容提供者（单例） =====
container
  .bind<HifiniMusic>(TYPES.HifiniMusic)
  .to(HifiniMusic)
  .inSingletonScope();
container
  .bind<NetEaseCloudMusic>(TYPES.NetEaseCloudMusic)
  .to(NetEaseCloudMusic)
  .inSingletonScope();
container
  .bind<QQMusic>(TYPES.QQMusic)
  .to(QQMusic)
  .inSingletonScope();

// ===== 数据源 & 仓库（单例） =====
// DataSource
container
  .bind<PlaylistDetailDataSource>(TYPES.PlaylistDetailDataSource)
  .to(PlaylistDetailDataSourceImpl)
  .inSingletonScope();
container
  .bind<HifiniThreadCacheDataSource>(TYPES.HifiniThreadCacheDataSource)
  .to(HifiniThreadCacheDataSourceImpl)
  .inSingletonScope();
container
  .bind<PlaylistDataSource>(TYPES.PlaylistDataSource)
  .to(PlaylistDataSourceImpl)
  .inSingletonScope();
container
  .bind<TrackDataSource>(TYPES.TrackDataSource)
  .to(TrackDataSourceImpl)
  .inSingletonScope();

// Repository
container
  .bind<TrackRepository>(TYPES.TrackRepository)
  .to(TrackRepositoryImpl)
  .inSingletonScope();
container
  .bind<PlaylistRepository>(TYPES.PlaylistRepository)
  .to(PlaylistRepositoryImpl)
  .inSingletonScope();
container
  .bind<HifiniThreadCacheRepository>(TYPES.HifiniThreadCacheRepository)
  .to(HifiniThreadCacheRepositoryImpl)
  .inSingletonScope();
