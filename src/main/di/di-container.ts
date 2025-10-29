// di-container.ts
import 'reflect-metadata';
import { Container, interfaces } from 'inversify';
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
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
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
import { AppDataPath, DataPath } from '@main/core/PathConfig';
import { DISymbol } from '@main/di/symbol';
import IpcController from '@main/core/ipc/IpcController';
import TrayManager from '@main/core/TrayManager';
import ShortCutManager from '@main/core/ShortCutManager';
import { SessionDataSourceImpl } from '@main/database/dataSource/impl/SessionDataSourceImpl';
import { SessionDataSource } from '@main/database/dataSource/SessionDataSource';
import { getOperatingSystem } from '@src/utils/helpers';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { BilibiliService } from '@main/contentProvider/Bilibili/BilibiliService';
import { Settings } from '@src/shared/settings/schema';
import { ConfigService } from '@main/core/configService';
import { OS } from '@src/shared/OS';
import { PreferenceService } from '@main/services/PreferenceService';
import { AiTextService, HeuristicAiTextService } from '@main/services/ai/AiTextService';
import { ProviderManager } from '@main/core/ProviderManager';
import { Logger } from 'winston';
import rootLogger from '@src/utils/logger';

const container = new Container();

container.bind<Logger>(DISymbol.Logger)
  .toDynamicValue((context: interfaces.Context) => {

    // 1. 获取 Inversify 正在注入的“目标” (父请求)
    const parentRequest = context.currentRequest.parentRequest;

    // 2. 如果没有父请求 (即有人直接请求 Logger)，给一个 'Default' scope
    if (!parentRequest) {
      return rootLogger.child({ context: 'Default' });
    }

    // 3. 获取目标类的构造函数 (e.g. ProxyServerManager class)
    const target = parentRequest.serviceIdentifier;

    console.debug(`Logger requested for target: ${String(target)}`);

    // 4. 获取scope 名称
    let scope: string;
    switch (typeof target) {
      case 'symbol':
        scope = String(target).replace(/^Symbol\((.*)\)$/, '$1');
        break;
      case 'string':
        scope = target;
        break;
      default:
        scope = undefined;
    }
    console.debug(`Creating logger for scope: ${scope}`);
    // 5. 返回一个 *新创建的*、*带 Scope 的* 子 Logger
    return rootLogger.child({ context: scope });
  });

// ===== 关键路径 和常量 =====
container.bind<DataPath>(DISymbol.DataPath).toConstantValue(AppDataPath);

// ===== 常量/第三方库实例 =====
container.bind<OS>(DISymbol.RunningOS).toConstantValue(getOperatingSystem());
container.bind<boolean>(DISymbol.IsDevelopment).toConstantValue(process.env.NODE_ENV === 'development');
//===== 用于存储设置的 Store 实例（单例） =====
const settingsStore = new Store<Settings>({ name: 'settings', watch: true });
container.bind<Store<Settings>>(DISymbol.SettingsStore).toConstantValue(settingsStore);

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
      diskCacheDir: AppDataPath.musicCacheDir,
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
container.bind<ConfigService>(DISymbol.ConfigService).to(ConfigService).inSingletonScope();

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
  .bind<ProviderManager>(DISymbol.ProviderManager)
  .to(ProviderManager)
  .inSingletonScope();

container
  .bind<PreferenceService>(DISymbol.PreferenceService)
  .to(PreferenceService)
  .inSingletonScope();

// ===== AI/Text utilities（根据 Settings 选择提供方，禁用或无密钥则退回本地兜底） =====
try {
  const cfg = container.get<ConfigService>(DISymbol.ConfigService);
  const ai = (cfg.get('services.ai') as any) ?? {};
  const enabled = !!ai.enabled;
  const provider = String(ai.provider ?? 'gemini');
  const key = String(ai.geminiApiKey ?? '');
  const model = String(ai.geminiModel ?? 'gemini-1.5-flash');

  if (enabled && provider === 'gemini' && key) {
    container
      .bind<AiTextService>(DISymbol.AiTextService)
      .toDynamicValue(() => {
        // Lazy require，避免未启用时加载 SDK
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GeminiAiTextService } = require('@main/services/ai/providers/GeminiTextService');
        return new GeminiAiTextService(key, model);
      })
      .inSingletonScope();
    console.info(`AI provider: Gemini (${model}) [from settings]`);
  } else {
    container
      .bind<AiTextService>(DISymbol.AiTextService)
      .to(HeuristicAiTextService)
      .inSingletonScope();
    console.info('AI provider: Heuristic (disabled or no key)');
  }
} catch (e) {
  container
    .bind<AiTextService>(DISymbol.AiTextService)
    .to(HeuristicAiTextService)
    .inSingletonScope();
  console.warn('AI provider init failed, fallback to Heuristic:', e);
}


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
container
  .bind<YouTubeMusic>(DISymbol.YouTubeMusic)
  .to(YouTubeMusic)
  .inSingletonScope();
container
  .bind<Bilibili>(DISymbol.Bilibili)
  .to(Bilibili)
  .inSingletonScope();

container
  .bind<BilibiliService>(DISymbol.BilibiliService)
  .to(BilibiliService)
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
rootLogger.info('DI 容器初始化完成');

export { container };
