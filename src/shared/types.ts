import { Platform } from '@main/enum/Platform';

export abstract class TrackModel {
  id: number; // 用于数据库的主键
  platform: Platform;
  platform_unique_id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover_src: string;
  created_at: Date;


  getIdentifier() {
    return `${this.platform}-${this.platform_unique_id}`;
  }

  // abstract  build(json: any): TrackModel;

}


export class NetEaseCloudMusicTrackModel extends TrackModel {
  id: number;
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  fee: number;

  constructor(id: number, album: string, artist: string, cover_src: string, created_at: Date, duration: number, platform: string, platform_unique_id: string, title: string) {
    super();
    this.id = id;
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = created_at;
    this.duration = duration;
    this.platform = Platform.NET_EASE_CLOUD_MUSIC;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
  }

  public static build(json: any): TrackModel {
    return new NetEaseCloudMusicTrackModel(
      json.id,
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
    );
  }

  static empty(): TrackModel {
    return new NetEaseCloudMusicTrackModel(0, '', '', '', new Date(), 0, '', '', '');
  }

  private isFree() {
    return this.fee === 0 || this.fee === 8;
  }

}


export class PlaylistModel {
  playlist_id: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  is_persistent?: boolean = false;
  description: string;
  created_at: Date;
  tracks: TrackModel[];
  creator: string;
  modified_at: Date;
  cover_src: string;

  constructor(playlist_id: number, platform: Platform, platform_unique_id: string, title: string, is_persistent: boolean, description: string, created_at: Date, tracks: TrackModel[], creator: string, modified_at: Date, cover_src: string) {
    this.playlist_id = playlist_id;
    this.platform = platform;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
    this.is_persistent = is_persistent;
    this.description = description;
    this.created_at = created_at;
    this.tracks = tracks;
    this.creator = creator;
    this.modified_at = modified_at;
    this.cover_src = cover_src;
  }

  public static build(json: any): PlaylistModel {
    return new PlaylistModel(
      json.playlist_id,
      json.platform,
      json.platform_unique_id,
      json.title,
      json.is_persistent,
      json.description,
      json.created_at,
      json.tracks,
      json.creator,
      json.modified_at,
      json.cover_src,
    );
  }
}


export class LocalPlayTrackModel extends TrackModel {
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;

  constructor(album: string, artist: string, cover_src: string, created_at: Date, duration: number, platform: string, platform_unique_id: string, title: string) {
    super();
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = created_at;
    this.duration = duration;
    this.platform = Platform.LOCAL;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
  }

  public static build(json: any): TrackModel {
    return new LocalPlayTrackModel(
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
    );
  }

  static empty(): TrackModel {
    return new LocalPlayTrackModel('', '', '', new Date(), 0, '', '', '');
  }
}


export class HifiniTrackModel extends TrackModel {
  id: number;
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;

  constructor(id: number, album: string, artist: string, cover_src: string, created_at: Date, duration: number, platform: string, platform_unique_id: string, title: string) {
    super();
    this.id = id;
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = created_at;
    this.duration = duration;
    this.platform = Platform.HIFINI;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
  }

  public static build(json: any): TrackModel {
    return new HifiniTrackModel(
      json.id,
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
    );
  }


  static empty() {
    return new HifiniTrackModel(0, '', '', '', new Date(), 0, '', '', '');
  }
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


export interface FusionSearchResult {
  tracks: TrackModel[],
  playlists: PlaylistModel[],
}


export enum MusicLibraryItemType {
  PLAYLIST = 'Playlist',
  ALBUM = 'Album',
  LIBRARY = 'Library',
}

export interface BaseMusicLibraryItem {
  title: string,
  type: MusicLibraryItemType,
  cover_src: string,

}

export interface MusicLibraryItem extends BaseMusicLibraryItem {
  items: MusicLibraryItem[],
}

export interface PlaylistItem extends BaseMusicLibraryItem {
  platform: Platform,
  platform_unique_id: string,
  persistent_id: string,
}


