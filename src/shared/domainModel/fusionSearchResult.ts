import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

/**
 * FusionSearchResult 接口：表示搜索结果，包含歌曲和歌单
 */
export interface FusionSearchResult {
  track_result: TrackEntity[];
  playlists_result: PlaylistEntity[];
}