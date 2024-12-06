// di-container.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { Playlist, PlaylistDetail, sequelize } from '@main/models';
import { Sequelize } from 'sequelize';
import TrackRepository from '@main/repository/TrackRepository';
import TrackRepositoryImpl from '@main/repository/impl/TrackRepositoryImpl';
import PlaylistRepositoryImpl from '@main/repository/impl/PlaylistRepositoryImpl';
import PlaylistRepository from '@main/repository/PlaylistRepository';
import HifiniThreadCacheRepository from '@main/repository/HifiniThreadCacheRepository';
import HifiniThreadCacheRepositoryImpl from '@main/repository/impl/HifiniThreadCacheRepositoryImpl';
import PlaylistDetailRepositoryImpl from '@main/repository/impl/PlaylistDetailRepositoryImpl';
import PlaylistDetailRepository from '@main/repository/PlaylistDetailRepository';
import Store from 'electron-store';
import LocalLibraryService from '@main/services/localLibraryService';
import ProxyServerManager from '@main/app/proxyServer';
import TrackService from '@main/services/TrackService';
import HifiniMusicService from '@main/services/HifiniMusicService';
import { Track } from '@main/models/Track';
import PlaylistService from '@main/services/playlistService';
import {HifiniThreadCache} from '@main/models/HifiniThreadCache';

const container = new Container();
export { container };

container.bind<any>('Store').toConstantValue(new Store({
    watch: true,
  }
))
;

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

container.bind<HifiniMusicService>('HifiniMusicService').to(HifiniMusicService);

container.bind<PlaylistService>('PlaylistService').to(PlaylistService);

container.bind<PlaylistDetail>('PlaylistDetail').to(PlaylistDetail);