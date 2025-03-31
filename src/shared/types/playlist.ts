import { Platform } from '@main/enum/Platform';
import type { TrackModel } from '@src/shared/types';

/**
 * FusionSearchResult 接口：表示搜索结果，包含歌曲和歌单
 */
export interface FusionSearchResult {
  tracks: TrackModel[];
  playlists: PlaylistModel[];
}

/**
 * MusicLibraryItemType 枚举：表示音乐库中项目的类型
 */
export enum MusicLibraryItemType {
  PLAYLIST = 'Playlist',
  ALBUM = 'Album',
  LIBRARY = 'Library',
}

/**
 * BaseMusicLibraryItem 接口：音乐库中基础项
 */
export interface BaseMusicLibraryItem {
  title: string;
  type: MusicLibraryItemType;
  cover_src: string;
}

/**
 * MusicLibraryItem 接口：具有子项的音乐库项
 */
export interface MusicLibraryItem extends BaseMusicLibraryItem {
  items: MusicLibraryItem[];
}

/**
 * PlaylistItem 接口：表示歌单项
 */
export interface PlaylistItem extends BaseMusicLibraryItem {
  platform: Platform;
  platform_unique_id: string;
  persistent_id: string;
}

/**
 * 在这里先声明 PlaylistModel 的类型，避免循环依赖
 */
export interface PlaylistModel {
  playlist_id: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  is_persistent?: boolean;
  description: string;
  created_at: Date;
  tracks: TrackModel[];
  creator: string;
  modified_at: Date;
  cover_src: string;
}