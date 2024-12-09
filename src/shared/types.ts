export interface TrackModel {
  id?: number,
  platform: string,
  platform_unique_id: string,
  title: string,
  artist: string,
  album: string,
  duration: number,
  cover_src: string,
  created_at: Date,
}

export interface PlaylistModel {
  playlist_id: number,
  title: string,
  description: string,
  created_at: Date,
  tracks: TrackModel[],
  creator: string,
  modified_at: Date,
}


export interface HifiniThreadCacheModel {
  data_href: string,
  title: string,
  artist: string,
  cover_src: string,
  un_redirected_url: string,
  cached_at: Date,
  modified_at: Date,
}


export interface PlayerState {
  queue: TrackModel[],
  volume: number,
  indexList: number[],
  currentIndex: number,
  playbackMode: 'loop' | 'shuffle' | 'repeat',
  audioSrc: string,
  isPlaying: boolean,
  currentTime: number,
  currentTrackInfo: TrackModel | null,
  nextTracks: TrackModel[],

}



