// file: src/renderer/core/MusicLibraryController.ts (或 src/renderer/services/MusicLibraryController.ts)
import { playlistContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { AbstractController } from './AbstractController'; // 调整路径

type MusicLibrarySubscriberArgs = [activePlaylist: PlaylistEntity | null, playlists: PlaylistEntity[]];

export default class MusicLibraryController extends AbstractController<MusicLibrarySubscriberArgs> {
  public playlists: PlaylistEntity[] = [];
  public selectedLibraryItem: number | null = null; // 选中项的索引
  public isMusicLibraryCollapsed = true; // 注意：此状态与 MainWindowController 中的类似状态的关系
  private _activatePlaylistEntity: PlaylistEntity | null = null;

  constructor() {
    super();
    console.log('MusicLibraryController: 正在初始化并加载歌单...');
    this._initializePlaylists().then(() => {
      console.log('MusicLibraryController: 歌单初始化完成。');
    }).catch(err => {
      console.error('MusicLibraryController: 歌单初始化失败:', err);
    });
  }

  public get activePlaylist(): PlaylistEntity | null {
    return this._activatePlaylistEntity;
  }

  /**
   * 设置当前激活的歌单。
   * 这个歌单对象可能来自当前的 playlists 数组，也可能是一个新的外部对象。
   * @param newPlaylist 要激活的歌单，或 null 表示没有激活的歌单。
   */
  public set activePlaylist(newPlaylist: PlaylistEntity | null) {
    // 检查是否真的发生了变化 (比较ID，因为对象实例可能不同但代表同一个歌单)
    if (this._activatePlaylistEntity?.platform_unique_id === newPlaylist?.platform_unique_id && this._activatePlaylistEntity?.platform === newPlaylist?.platform) {
      // 如果ID相同，但对象实例不同（例如，从外部传入了一个新的实例，但内容一样），
      // 我们可以选择更新为新的实例，或者保持旧的实例。
      // 为了简单和一致性，如果ID相同，我们认为激活状态未变，除非需要更新对象本身的引用。
      // 如果希望总是用新实例替换，可以移除此检查或添加 this._activatePlaylistEntity !== newPlaylist
      if (this._activatePlaylistEntity === newPlaylist) return; // 实例和ID都相同，确定无变化
    }

    const oldActivePlaylistId = this._activatePlaylistEntity?.playlist_id;
    const oldSelectedLibraryItem = this.selectedLibraryItem;

    this._activatePlaylistEntity = newPlaylist;

    if (newPlaylist) {
      // 尝试在当前列表中找到这个新激活的歌单
      const indexInCurrentList = this.playlists.findIndex(p => p.playlist_id === newPlaylist.playlist_id);
      if (indexInCurrentList !== -1) {
        this.selectedLibraryItem = indexInCurrentList;
      } else {
        // 如果新激活的歌单不在当前列表中，则 selectedLibraryItem 不指向任何列表内项目
        this.selectedLibraryItem = null;
      }
    } else {
      // 如果 newPlaylist 为 null，则没有选中的列表内项目
      this.selectedLibraryItem = null;
    }

    // 仅当激活的歌单ID或选中索引确实发生变化时才通知
    // (考虑到 newPlaylist 可能与 _activatePlaylistEntity 是不同实例但id相同的情况)
    if (oldActivePlaylistId !== this._activatePlaylistEntity?.playlist_id || oldSelectedLibraryItem !== this.selectedLibraryItem) {
      super.notify();
    }
  }

  public async refreshPlaylists(): Promise<void> {
    console.log('MusicLibraryController: 正在重载歌单...');
    await this._fetchAndSetPlaylists(true); // 获取并通知
    console.log('MusicLibraryController: 歌单重载完成。');
  }

  public selectItem(index: number): void {
    if (index >= 0 && index < this.playlists.length) {
      if (this.selectedLibraryItem !== index) {
        this._setActivePlaylistByIndex(index, true);
      }
    } else {
      console.warn(`MusicLibraryController: 尝试选择无效的索引 ${index}。歌单数量: ${this.playlists.length}`);
    }
  }

  public toggleMusicLibraryCollapse(): void {
    this.isMusicLibraryCollapsed = !this.isMusicLibraryCollapsed;

    console.log('MusicLibraryController: 切换音乐库折叠状态为:', this.isMusicLibraryCollapsed);

    super.notify();
  }

  /**
   * 实现父类的抽象方法。
   */
  protected getCurrentStateForSubscriber(): MusicLibrarySubscriberArgs {
    return [this._activatePlaylistEntity, this.playlists];
  }

  private async _initializePlaylists(): Promise<void> {
    await this._fetchAndSetPlaylists(true); // 初始加载，暂时不通知（订阅时会立即通知）
    if (this.playlists.length > 0 && this.selectedLibraryItem === null) {
      this._setActivePlaylistByIndex(0, true); // 设置激活歌单，但不立即通知
    }
    console.log('MusicLibraryController: 歌单初始化加载完成。');
    // 第一次通知会在第一个订阅者通过 subscribe() 注册时自动发生
  }

  /**
   * 内部方法，用于获取和设置歌单列表，并可选择是否通知。
   * @param shouldNotify 是否在获取成功后通知订阅者
   */
  private async _fetchAndSetPlaylists(shouldNotify: boolean = true): Promise<void> {
    try {
      this.playlists = await playlistContext.getPlaylists();

      // 更新当前激活的歌单和选中项
      // 如果之前有激活的歌单，尝试在新的列表中找到它
      if (this._activatePlaylistEntity) {
        const currentIndex = this.playlists.findIndex(p => p.playlist_id === this._activatePlaylistEntity!.playlist_id);
        if (currentIndex !== -1) {
          this.selectedLibraryItem = currentIndex;
          // _activatePlaylistEntity 保持不变或从新列表中获取引用（如果对象不同但id相同）
          this._activatePlaylistEntity = this.playlists[currentIndex];
        } else {
          // 旧的激活歌单在新列表中不存在，则尝试选中第一个
          this._setActivePlaylistByIndex(this.playlists.length > 0 ? 0 : null);
        }
      } else if (this.playlists.length > 0) {
        // 如果之前没有激活的歌单，且新列表不为空，则选中第一个
        this._setActivePlaylistByIndex(0);
      } else {
        // 列表为空
        this._setActivePlaylistByIndex(null);
      }

      if (shouldNotify) {
        super.notify();
      }
    } catch (err) {
      console.error('MusicLibraryController: 加载歌单失败:', err);
      // 可选：设置错误状态并通知
      this.playlists = [];
      this._setActivePlaylistByIndex(null);
      if (shouldNotify) {
        super.notify(); // 通知错误状态或空状态
      }
    }
  }

  /**
   * 通过索引设置激活的歌单。
   * @param index 要激活的歌单在 playlists 数组中的索引，或 null 清除激活状态。
   * @param shouldNotify 是否通知订阅者，默认为 true。
   */
  private _setActivePlaylistByIndex(index: number | null, shouldNotify: boolean = true): void {
    if (index !== null && index >= 0 && index < this.playlists.length) {
      this.selectedLibraryItem = index;
      this._activatePlaylistEntity = this.playlists[index];
    } else {
      this.selectedLibraryItem = null;
      this._activatePlaylistEntity = null;
    }
    if (shouldNotify) {
      super.notify();
    }
  }


}