/**
 * Inversify 注入标识符统一管理
 */
export const DiSymbol = {
  Store: Symbol.for('Store'),
  Sequelize: Symbol.for('Sequelize'),
  FileCacheManager: Symbol.for('FileCacheManager'),
  WindowManager: Symbol.for('WindowManager'),
  HifiniDownloader: Symbol.for('HifiniDownloader'),
  ProxyServerManager: Symbol.for('ProxyServerManager'),
  LocalLibraryService: Symbol.for('LocalLibraryService'),
  TrackService: Symbol.for('TrackService'),
  PlaylistService: Symbol.for('PlaylistService'),
  LyricService: Symbol.for('LyricService'),
  HifiniMusic: Symbol.for('HifiniMusic'),
  NetEaseCloudMusic: Symbol.for('NetEaseCloudMusic'),
  QQMusic: Symbol.for('QQMusic'),
  PlaylistDetailDataSource: Symbol.for('PlaylistDetailDataSource'),
  HifiniThreadCacheDataSource: Symbol.for('HifiniThreadCacheDataSource'),
  PlaylistDataSource: Symbol.for('PlaylistDataSource'),
  TrackDataSource: Symbol.for('TrackDataSource'),
  TrackRepository: Symbol.for('TrackRepository'),
  PlaylistRepository: Symbol.for('PlaylistRepository'),
  HifiniThreadCacheRepository: Symbol.for('HifiniThreadCacheRepository'),
  PreferenceService: Symbol.for('PreferenceService'),
  IpcController: Symbol.for('IpcController'),
};