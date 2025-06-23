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
import PlaylistService from '@main/services/PlaylistService';
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
import { AppDataPath, DataPath} from '@main/core/PathConfig';
import { DISymbol } from '@main/di/symbol';
import { PreferenceService } from '@main/services/PreferenceService';
import IpcController from '@main/core/IpcController';
import TrayManager from '@main/core/TrayManager';
import ShortCutManager from '@main/core/ShortCutManager';
import chalk from 'chalk';
import { SessionDataSourceImpl } from '@main/database/dataSource/impl/SessionDataSourceImpl';
import { SessionDataSource } from '@main/database/dataSource/SessionDataSource';
import { getOperatingSystem } from '@src/utils/helpers';
import { OS } from '@main/core/enum/Platform';

const container = new Container();
export { container };


// ===== 关键路径 和常量 =====
container.bind<DataPath>(DISymbol.DataPath).toConstantValue(AppDataPath);

// ===== 常量/第三方库实例 =====
container.bind<OS>(DISymbol.RunningOS).toConstantValue(getOperatingSystem());
container.bind<boolean>(DISymbol.IsDevelopment).toConstantValue(process.env.NODE_ENV === 'development');
container.bind<Store>(DISymbol.Store).toConstantValue(new Store({ watch: true }));
container
  .bind<SequelizeInstance>(DISymbol.Sequelize)
  .toConstantValue(sequelize as SequelizeInstance);

// ===== IPC 控制器（单例） =====
container
  .bind<IpcController>(DISymbol.IpcController)
  .to(IpcController)
  .inSingletonScope();
// ===== 核心管理器/服务（单例） =====
container
  .bind<FileCacheManager>(DISymbol.FileCacheManager)
  .toConstantValue(
    new FileCacheManager({
      diskCacheDir: AppDataPath.musicCacheDir
    }));
container
  .bind<WindowManager>(DISymbol.WindowManager)
  .to(WindowManager)
  .inSingletonScope();
container
  .bind<HifiniDownloader>(DISymbol.HifiniDownloader)
  .to(HifiniDownloader)
  .inSingletonScope();
container
  .bind<ProxyServerManager>(DISymbol.ProxyServerManager)
  .to(ProxyServerManager)
  .inSingletonScope();

container
  .bind<TrayManager>(DISymbol.TrayManager)
  .to(TrayManager)
  .inSingletonScope();
container
  .bind<ShortCutManager>(DISymbol.ShortcutManager)
  .to(ShortCutManager)
  .inSingletonScope();

// ===== 业务服务（单例） =====
container
  .bind<LocalLibraryService>(DISymbol.LocalLibraryService)
  .to(LocalLibraryService)
  .inSingletonScope();
container
  .bind<TrackService>(DISymbol.TrackService)
  .to(TrackService)
  .inSingletonScope();
container
  .bind<PlaylistService>(DISymbol.PlaylistService)
  .to(PlaylistService)
  .inSingletonScope();
container
  .bind<LyricService>(DISymbol.LyricService)
  .to(LyricService)
  .inSingletonScope();

container
  .bind<PreferenceService>(DISymbol.PreferenceService)
  .to(PreferenceService)
  .inSingletonScope();

// ===== 内容提供者（单例） =====
container
  .bind<HifiniMusic>(DISymbol.HifiniMusic)
  .to(HifiniMusic)
  .inSingletonScope();
container
  .bind<NetEaseCloudMusic>(DISymbol.NetEaseCloudMusic)
  .to(NetEaseCloudMusic)
  .inSingletonScope();
container
  .bind<QQMusic>(DISymbol.QQMusic)
  .to(QQMusic)
  .inSingletonScope();

// ===== 数据源 & 仓库（单例） =====
// DataSource
container
  .bind<PlaylistDetailDataSource>(DISymbol.PlaylistDetailDataSource)
  .to(PlaylistDetailDataSourceImpl)
  .inSingletonScope();
container
  .bind<HifiniThreadCacheDataSource>(DISymbol.HifiniThreadCacheDataSource)
  .to(HifiniThreadCacheDataSourceImpl)
  .inSingletonScope();
container
  .bind<PlaylistDataSource>(DISymbol.PlaylistDataSource)
  .to(PlaylistDataSourceImpl)
  .inSingletonScope();
container
  .bind<TrackDataSource>(DISymbol.TrackDataSource)
  .to(TrackDataSourceImpl)
  .inSingletonScope();
container
  .bind<SessionDataSource>(DISymbol.SessionDataSource)
  .to(SessionDataSourceImpl)
  .inSingletonScope();

// Repository
container
  .bind<TrackRepository>(DISymbol.TrackRepository)
  .to(TrackRepositoryImpl)
  .inSingletonScope();
container
  .bind<PlaylistRepository>(DISymbol.PlaylistRepository)
  .to(PlaylistRepositoryImpl)
  .inSingletonScope();
container
  .bind<HifiniThreadCacheRepository>(DISymbol.HifiniThreadCacheRepository)
  .to(HifiniThreadCacheRepositoryImpl)
  .inSingletonScope();


// ===== 其他 =====
console.info(chalk.green('DI 容器初始化完成'));
