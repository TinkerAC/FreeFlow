// file: src/renderer/services/MusicLibraryController.ts
import { playlistContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

type Subscriber = (playlist: PlaylistEntity, playlists: PlaylistEntity[]) => void;

export default class MusicLibraryController {

  playlists: PlaylistEntity[] = [];
  selectedLibraryItem: number | null = null;
  private _activatePlaylistEntity: PlaylistEntity | null = null;
  private subscribers: Subscriber[] = [];
  public isMusicLibraryCollapsed = true;

  constructor() {
    // 构造时立即拉取一次
    console.log('正在加载歌单...');
    this.fetchAndCompletePlaylists().then(
      () => {
        //选中第一个歌单
        if (this.playlists.length > 0) {
          this.selectItem(0);
          this.notify();
        }
        console.log('歌单加载完成');
      },
    );
  }

  private notify() {
    this.subscribers.forEach(fn => fn(this._activatePlaylistEntity, this.playlists));
  }

  async fetchAndCompletePlaylists() {
    try {
      const lists = await playlistContext.getPlaylists();
      this.playlists = lists;
      if (lists.length > 0) {
        this.selectItem(0);
      }
      this.notify();
    } catch (err) {
      console.error('Failed to fetch playlist_result:', err);
    }
  }

  selectItem(index: number) {
    this.selectedLibraryItem = index;
    this._activatePlaylistEntity = this.playlists[index] || null;
    this.notify();
  }

  refreshPlaylists() {
    console.log('正在重载歌单...');
    this.fetchAndCompletePlaylists().then(() => {
      console.log('歌单重载完成');
      this.notify();
    });

  }

  subscribe(fn: Subscriber) {
    this.subscribers.push(fn);
    // 立即同步一次当前状态
    fn(this._activatePlaylistEntity, this.playlists);

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  public toggleMusicLibraryCollapse() {
    console.log('Toggle music library collapse state:', this.isMusicLibraryCollapsed);
    this.isMusicLibraryCollapsed = !this.isMusicLibraryCollapsed;
    this.notify();
  }

  public set activePlaylist(playlist: PlaylistEntity) {
    this._activatePlaylistEntity = playlist;
    this.notify();
  }

  public get activePlaylist(): PlaylistEntity | null {
    return this._activatePlaylistEntity;
  }


}