// di-container.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { Playlist, PlaylistDetail, sequelize } from '@main/database/seqimpl';
import { Sequelize } from 'sequelize';
import TrackRepository from '@main/database/repository/TrackRepository';
import TrackRepositoryImpl from '@main/database/repository/impl/TrackRepositoryImpl';
import PlaylistRepositoryImpl from '@main/database/repository/impl/PlaylistRepositoryImpl';
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import HifiniThreadCacheRepository from '@main/database/repository/HifiniThreadCacheRepository';
import HifiniThreadCacheRepositoryImpl from '@main/database/repository/impl/HifiniThreadCacheRepositoryImpl';
import PlaylistDetailRepositoryImpl from '@main/database/repository/impl/PlaylistDetailRepositoryImpl';
import PlaylistDetailRepository from '@main/database/repository/PlaylistDetailRepository';
import Store from 'electron-store';
import LocalLibraryService from '@main/services/localLibraryService';
import ProxyServerManager from '@main/app/proxyServer';
import TrackService from '@main/services/TrackService';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import { Track } from '@main/database/seqimpl/Track';
import PlaylistService from '@main/services/playlistService';
import { HifiniThreadCache } from '@main/database/seqimpl/HifiniThreadCache';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { LyricService } from '@main/services/LyricService';
import { FileCacheManager } from '@main/FileCacheManager';
import { musicCacheDir } from '@main/app/pathConfig';
import { HifiniDownloader } from '@main/services/Downloader';

const container = new Container();
export { container };

container.bind<Store>('Store').toConstantValue(new Store({
    watch: true,
  },
));

//FileCacheManager
container.bind<FileCacheManager>('FileCacheManager').toConstantValue(
  new FileCacheManager(
    {
      diskCacheDir: musicCacheDir,
    }),
);


container.bind<HifiniDownloader>('HifiniDownloader').toConstantValue(
  new HifiniDownloader(
    container.get('Store'),
  ),
);

container.bind<Sequelize>('Sequelize').toConstantValue(sequelize);

container.bind<HifiniThreadCache>('HifiniThreadCache').to(HifiniThreadCache);

container.bind<Track>('Track').to(Track);
container.bind<Playlist>('Playlist').to(Playlist);


container.bind<TrackRepository>('TrackRepository').to(TrackRepositoryImpl);

container.bind<PlaylistRepository>('PlaylistRepository').to(PlaylistRepositoryImpl);

container.bind<HifiniThreadCacheRepository>('HifiniThreadCacheRepository').to(HifiniThreadCacheRepositoryImpl);

container.bind<PlaylistDetailRepository>('PlaylistDetailRepository').to(PlaylistDetailRepositoryImpl);

container.bind<LocalLibraryService>('LocalLibraryService').to(LocalLibraryService);
container.bind<TrackService>('TrackService').to(TrackService);
container.bind<ProxyServerManager>('ProxyServerManager').to(ProxyServerManager);


//bind musicContentProvider
container.bind<HifiniMusic>('HifiniMusic').to(HifiniMusic);
container.bind<NetEaseCloudMusic>('NetEaseCloudMusic').to(NetEaseCloudMusic);
container.bind<QQMusic>('QQMusic').to(QQMusic);

container.bind<PlaylistService>('PlaylistService').to(PlaylistService);

container.bind<PlaylistDetail>('PlaylistDetail').to(PlaylistDetail);
container.bind<LyricService>('LyricService').to(LyricService);





