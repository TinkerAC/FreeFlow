// file: src/renderer/core/MainWindowController.ts (或 src/renderer/services/MainWindowController.ts)
import { AbstractController } from './AbstractController'; // 调整路径

// MainWindowController 的订阅者不需要参数
type MainWindowSubscriberArgs = [];

export default class MainWindowController extends AbstractController<MainWindowSubscriberArgs> {
  public isMusicLibraryCollapsed = false;
  public isRightContentVisible = true;

  constructor() {
    super(); // 调用 AbstractController 的构造函数
    this.handleResize = this.handleResize.bind(this); // 确保 handleResize 中 this 的正确性
    this.init();
  }

  private init(): void {
    this._updateLayoutState(); // 初始化时根据窗口大小设置状态
    window.addEventListener('resize', this.handleResize);
  }

  // 封装了根据窗口大小更新内部状态并通知的逻辑
  private _updateLayoutState(): void {
    const w = window.innerWidth;
    let needsNotification = false;

    const newMusicLibraryCollapsed = w < 1400; // 简化后：宽度小于1400时，音乐库折叠
    const newRightContentVisible = w >= 1000;   // 宽度大于等于1000时，右侧内容可见

    if (this.isMusicLibraryCollapsed !== newMusicLibraryCollapsed) {
      this.isMusicLibraryCollapsed = newMusicLibraryCollapsed;
      needsNotification = true;
    }

    if (this.isRightContentVisible !== newRightContentVisible) {
      this.isRightContentVisible = newRightContentVisible;
      needsNotification = true;
    }

    if (needsNotification) {
      super.notify(); // 调用父类的 notify 方法
    }
  }

  private handleResize(): void {
    this._updateLayoutState();
  }

  /**
   * 实现父类的抽象方法，提供给订阅者的参数。
   * 对于 MainWindowController，订阅者不接收参数。
   */
  protected getCurrentStateForSubscriber(): MainWindowSubscriberArgs {
    return [];
  }

  public toggleMusicLibraryCollapsed(): void {
    this.isMusicLibraryCollapsed = !this.isMusicLibraryCollapsed;
    super.notify();
  }

  public toggleRightContent(): void {
    this.isRightContentVisible = !this.isRightContentVisible;
    super.notify();
  }

  // subscribe 方法已由 AbstractController 继承

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    super.dispose(); // 调用父类的 dispose 清理订阅者
    // console.log('MainWindowController disposed.');
  }
}