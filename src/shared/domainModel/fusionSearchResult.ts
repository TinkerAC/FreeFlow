import { TrackModel } from '@src/shared/domainModel/TrackModel';

import { PlaylistModel } from '@src/shared/domainModel/playlistModel';

/**
 * FusionSearchResult 接口：表示搜索结果，包含歌曲和歌单
 */
export interface FusionSearchResult {
  tracks: TrackModel[];
  playlists: PlaylistModel[];
}