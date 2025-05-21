// file: src/renderer/services/MusicLibraryController.ts
import { playlistContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

type Subscriber = (playlist: PlaylistEntity, playlists: PlaylistEntity[]) => void;

export default class MusicLibraryController {
  playlists: PlaylistEntity[] = [];
  selectedItem: number | null = null;
  selectedPlaylistInfo: PlaylistEntity | null = null;
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
    this.subscribers.forEach(fn => fn(this.selectedPlaylistInfo, this.playlists));
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
      console.error('Failed to fetch playlists:', err);
    }
  }

  selectItem(index: number) {
    this.selectedItem = index;
    this.selectedPlaylistInfo = this.playlists[index] || null;
    this.notify();
  }

  refreshPlaylists() {
    console.log('正在重载歌单...');
    this.fetchAndCompletePlaylists();
  }

  subscribe(fn: Subscriber) {
    this.subscribers.push(fn);
    // 立即同步一次当前状态
    fn(this.selectedPlaylistInfo, this.playlists);

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  public toggleMusicLibraryCollapse() {
    console.log('Toggle music library collapse state:', this.isMusicLibraryCollapsed);
    this.isMusicLibraryCollapsed = !this.isMusicLibraryCollapsed;
    this.notify();
  }
}